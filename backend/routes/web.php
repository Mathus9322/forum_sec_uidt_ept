<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (is_file(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }

    return view('welcome');
});

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $frontend = rtrim(env('FRONTEND_URL', 'http://localhost:4200'), '/');

    return redirect($frontend.'/login?token='.urlencode($token).'&email='.urlencode($request->query('email', '')));
})->name('password.reset');

Route::get('/{path}', function () {
    $frontend = public_path('index.html');
    abort_unless(is_file($frontend), 404);

    return response()->file($frontend);
})->where('path', '^(?!api(?:/|$)|sanctum(?:/|$)).*');
