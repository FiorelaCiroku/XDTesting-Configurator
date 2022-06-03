<?php


$envFile = '.env';
copy('.env.example', $envFile);
$env = file_get_contents($envFile);

$key = 'AES_SECRET';
$aesSecret = base64_encode(random_bytes(32));

if (str_contains($env, "$key=")) {
    $env = preg_replace("/$key=.*/", "$key=\"$aesSecret\"", $env);
} else {
    $env .= PHP_EOL . "$key=$aesSecret";
}

file_put_contents($envFile, $env);