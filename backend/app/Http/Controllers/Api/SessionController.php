<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningSession;

class SessionController extends Controller
{
    public function index()
    {
        return response()->json(
            LearningSession::query()
                ->select(['id', 'title', 'scheduled_at', 'theme', 'description', 'archived'])
                ->orderByDesc('scheduled_at')
                ->get(),
        );
    }
}
