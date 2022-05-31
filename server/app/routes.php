<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Symfony\Component\HttpClient\HttpClient;

return function (App $app) {
    $app->options('/{routes:.*}', function (Request $request, Response $response) {
        // CORS Pre-Flight OPTIONS Request Handler
        return $response;
    });

    $app->get('/login', function (Request $request, Response $response) {
        $qs = http_build_query([
            'scope' => $_ENV['GITHUB_SCOPES'],
            'client_id' => $_ENV['CLIENT_ID']
        ]);

        return $response->withStatus(302)
            ->withHeader(
                'Location',
                "https://github.com/login/oauth/authorize?$qs"
            );
    });

    $app->get('/login-callback', function (Request $request, Response $response) {
        $body = $request->getQueryParams();

	if (empty($body['code'])) {
	    $response->getBody()->write(json_encode(['error' => 'Missing code']));
            return $response->withStatus(500)
                ->withHeader('Content-Type', 'application/json');
        }

        $code = $body['code'];

        $httpClient = HttpClient::create();
        $apiResponse = $httpClient->request('POST', 'https://github.com/login/oauth/access_token', [
            'headers' => [
                'Content-type' => 'application/json'
            ],
            'body' => json_encode([
                'client_id' => $_ENV['CLIENT_ID'],
                'client_secret' => $_ENV['CLIENT_SECRET'],
                'code' => $code
            ])
        ]);

        $apiResponseCode = $apiResponse->getStatusCode();

        if ($apiResponseCode >= 300) {
            $response->getBody()->write(json_encode(['error' => 'Failed retrieving token']));
            return $response->withStatus(500)
                ->withHeader('Content-Type', 'application/json');
        }

        $result = explode('&', $apiResponse->getContent());
        $data = [];

        foreach ($result as $item) {
            $item = explode('=', $item);
            $data[urldecode($item[0])] = urldecode($item[1]);
        }

        if (empty($data['access_token'])) {
            $response->getBody()->write(json_encode(['error' => 'Failed retrieving token']));
            return $response->withStatus(500)
                ->withHeader('Content-Type', 'application/json');
        }

        $prevSalt = random_bytes(31);
        $nextSalt = random_bytes(61);

        $token = preg_replace("/^gho_/", "", $token);
        $token = base64_encode($prevSalt . $token . $nextSalt);

        $iv = random_bytes(16);
        $token = openssl_encrypt($token, 'aes-256-cbc', $_ENV['AES_SECRET'], iv: $iv);

        return base64_encode(base64_encode($iv) . '.' . base64_encode($token));

        setcookie('GITHUB_TOKEN', $token, httponly: true);

        return $response->withStatus(200);
    });

    $app->get('/is-auth', function (Request $request, Response $response) {
        $cookies = $request->getCookieParams();
        $isAuthenticated = !empty($cookies['GITHUB_TOKEN']);

	    if ($isAuthenticated) {
            return $response->withStatus(200);
        }

        return $response->withStatus(401);
    });

    $app->map(
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
        '/{routes:.*}',
        function (Request $request, Response $response) {
            $cookies = $request->getCookieParams();

            if (empty($cookies['GITHUB_TOKEN'])) {
                return $response->withStatus(401, 'Unauthorized');
            }

            [$iv, $token] = explode('.', base64_decode($cookies['GITHUB_TOKEN']));
            $token = openssl_decrypt(base64_decode($token), 'aes-256-cbc', $_ENV['AES_SECRET'], iv: base64_decode($iv));

            if ($token === false) {
                return $response->withStatus(401, 'Unauthorized');
            }

            $token = base64_decode($token);
            $token = 'gho_' . substr($token, 31, -61);


            $path = $request->getUri()->getPath();
            if (str_starts_with($path, '/')) {
                $path = substr($path, 1);
            }

            if (str_ends_with($path, 'contents/')) {
                $path .= '.xd-testing/UserInput.json';
            }

            $qs = $request->getUri()->getQuery();
            $url = "https://api.github.com/$path" . (empty($qs) ? '' : "?$qs");

            $ifNoneMatch = $request->getHeader('If-None-Match');
            $headers = [
                'Content-Type' => $request->getHeader('Content-Type'),
                'Authorization' => "Bearer $token[1]"
            ];

            if (!empty($ifNoneMatch)) {
                $headers['If-None-Match'] = $ifNoneMatch;
            }

            $httpClient = HttpClient::create();
            $apiResponse = $httpClient->request($request->getMethod(), $url, [
                'headers' => $headers,
                'body' => $request->getBody()->getContents()
            ]);

            $response = $response->withStatus($apiResponse->getStatusCode());
            $response->getBody()->write($apiResponse->getContent(false));

            $apiResponseHeaders = $apiResponse->getHeaders(false);

            foreach ($apiResponseHeaders as $key => $values) {
                if (!in_array($key, ['server', 'content-encoding']))
                $response = $response->withHeader($key, $values);
            }

            return $response;
        }
    );
};
