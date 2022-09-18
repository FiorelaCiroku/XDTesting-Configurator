<?php

namespace Tests;

use Closure;
use DI\ContainerBuilder;
use Dotenv\Dotenv;
use Exception;
use PHPUnit\Framework\TestCase as PHPUnit_TestCase;
use Prophecy\PhpUnit\ProphecyTrait;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\StreamFactory;
use Slim\Psr7\Headers;
use Slim\Psr7\Request as SlimRequest;
use Slim\Psr7\Uri;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

class TestCase extends PHPUnit_TestCase
{
    use ProphecyTrait;

    private array $defaultDiDefinitions;

    public function __construct(?string $name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
        $this->defaultDiDefinitions = [
            HttpClientInterface::class => new MockHttpClient()
        ];
    }

    /**
     * @param Closure|null           $envCustomInitialization
     * @param ResponseInterface|null $httpResponse
     * @return App
     * @throws Exception
     */
    protected function getAppInstance(Closure $envCustomInitialization = null, array $diDefinitions = []): App
    {
        // Initialize vlucas/phpdotenv library
        $dotenv = Dotenv::createMutable(__DIR__ . '/..', '.env.test');
        $dotenv->load();

        if (!empty($envCustomInitialization)) {
            $envCustomInitialization();
        }

        $diDefinitions = ($diDefinitions ?? []) + $this->defaultDiDefinitions;

        // Instantiate PHP-DI ContainerBuilder
        $containerBuilder = new ContainerBuilder();
        $containerBuilder->addDefinitions($diDefinitions);

        // Container intentionally not compiled for tests.

        // Build PHP-DI Container instance
        $container = $containerBuilder->build();

        // Instantiate the app
        AppFactory::setContainer($container);
        $app = AppFactory::create();

        // Register routes
        $routes = require __DIR__ . '/../app/routes.php';
        $routes($app);

        return $app;
    }

    /**
     * @param string $method
     * @param string $path
     * @param array  $headers
     * @param array  $cookies
     * @param array  $serverParams
     * @return Request
     */
    protected function createRequest(string $method, string $path, string $query = '', array $headers = ['HTTP_ACCEPT' => 'application/json'], array $cookies = [], array $serverParams = []): Request
    {
        $uri = new Uri('', '', 80, $path, $query);
        $handle = fopen('php://temp', 'w+');
        $stream = (new StreamFactory())->createStreamFromResource($handle);

        $h = new Headers();
        foreach ($headers as $name => $value) {
            $h->addHeader($name, $value);
        }

        return new SlimRequest($method, $uri, $h, $cookies, $serverParams, $stream);
    }

    protected function getResponseBody(\Psr\Http\Message\ResponseInterface $response): string
    {
        $body = $response->getBody();
        $body->seek(0);
        return $body->getContents();
    }
}
