<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnswerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\SessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');

Route::get('/sessions', [SessionController::class, 'index']);
Route::get('/questions', [QuestionController::class, 'index']);
Route::get('/questions/{question}', [QuestionController::class, 'show']);
Route::get('/users/{user}/avatar', [AuthController::class, 'avatar']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', fn (Request $request) => response()->json($request->user()));
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::patch('/profile', [AuthController::class, 'updateProfile']);
});

Route::middleware(['auth:sanctum', 'approved'])->group(function (): void {
    Route::post('/questions', [QuestionController::class, 'store'])->middleware('throttle:10,1');
    Route::patch('/questions/{question}', [QuestionController::class, 'update']);
    Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

    Route::post('/questions/{question}/answers', [AnswerController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/answers/{answer}', [AnswerController::class, 'update']);
    Route::delete('/answers/{answer}', [AnswerController::class, 'destroy']);
    Route::post('/answers/{answer}/accept', [AnswerController::class, 'accept']);

    Route::prefix('/admin')->group(function (): void {
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/sessions', [AdminController::class, 'sessions']);
        Route::post('/sessions', [AdminController::class, 'createSession']);
        Route::patch('/sessions/{session}', [AdminController::class, 'updateSession']);
        Route::delete('/sessions/{session}', [AdminController::class, 'deleteSession']);
    });
});
