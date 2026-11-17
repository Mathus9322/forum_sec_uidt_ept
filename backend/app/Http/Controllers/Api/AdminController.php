<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function users(Request $request)
    {
        $this->authorizeAdmin($request);

        return response()->json(User::query()->select(['id', 'name', 'email', 'role', 'approved'])->orderBy('name')->get());
    }

    public function updateUser(Request $request, User $user)
    {
        $this->authorizeAdmin($request);
        abort_if($request->user()->is($user), 422, 'Un administrateur ne peut pas modifier son propre compte ici.');

        $validated = $request->validate([
            'role' => ['required', Rule::in(['participant', 'animator', 'admin'])],
            'approved' => ['required', 'boolean'],
        ]);
        $user->update($validated);

        return response()->json($user->only(['id', 'name', 'email', 'role', 'approved']));
    }

    public function sessions(Request $request)
    {
        $this->authorizeAdmin($request);

        return response()->json(
            LearningSession::query()
                ->with('moderators:id,name,email,role,approved')
                ->orderByDesc('scheduled_at')
                ->get(),
        );
    }

    public function createSession(Request $request)
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateSession($request);
        $session = LearningSession::create(collect($validated)->except('moderator_ids')->all());
        $session->moderators()->sync($validated['moderator_ids'] ?? []);

        return response()->json($session->load('moderators:id,name,email,role,approved'), 201);
    }

    public function updateSession(Request $request, LearningSession $session)
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateSession($request);
        $session->update(collect($validated)->except('moderator_ids')->all());
        $session->moderators()->sync($validated['moderator_ids'] ?? []);

        return response()->json($session->load('moderators:id,name,email,role,approved'));
    }

    public function deleteSession(Request $request, LearningSession $session)
    {
        $this->authorizeAdmin($request);
        $session->delete();

        return response()->noContent();
    }

    private function validateSession(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'scheduled_at' => ['required', 'date'],
            'theme' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'archived' => ['sometimes', 'boolean'],
            'moderator_ids' => ['sometimes', 'array'],
            'moderator_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'animator')->where('approved', true)),
            ],
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Cette action est réservée aux administrateurs.');
    }
}
