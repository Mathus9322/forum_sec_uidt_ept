<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        User::create([
            ...$validated,
            'role' => 'participant',
            'approved' => false,
        ]);

        return response()->json([
            'message' => 'Votre demande a été envoyée. Un administrateur validera votre compte.',
        ], 202);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        $user = $request->user();
        if (! $user->approved) {
            Auth::logout();

            return response()->json([
                'message' => 'Votre compte attend la validation d’un administrateur.',
            ], 403);
        }

        $request->session()->regenerate();

        return response()->json(['message' => 'Connexion réussie.']);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Si cette adresse est associée à un compte, un lien de réinitialisation lui sera envoyé.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Le lien de réinitialisation est invalide ou expiré.'], 422);
        }

        return response()->json(['message' => 'Mot de passe réinitialisé.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'current_password' => ['required_with:password', 'current_password:web'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:max_width=2048,max_height=2048', 'max:2048'],
        ]);

        $user = $request->user();
        $user->name = $validated['name'];
        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $previousAvatarPath = $user->avatar_path;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            if (! is_string($avatarPath)) {
                throw new RuntimeException('Impossible d’enregistrer la photo de profil.');
            }
            $user->avatar_path = $avatarPath;
        }

        $user->save();
        if (isset($avatarPath) && $previousAvatarPath) {
            Storage::disk('public')->delete($previousAvatarPath);
        }

        return response()->json($user);
    }

    public function avatar(User $user)
    {
        abort_unless($user->avatar_path && Storage::disk('public')->exists($user->avatar_path), 404);

        return Storage::disk('public')->response($user->avatar_path, null, [
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
