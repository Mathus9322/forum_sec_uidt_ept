<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->approved, 403, 'Votre compte attend la validation d’un administrateur.');

        return $next($request);
    }
}
