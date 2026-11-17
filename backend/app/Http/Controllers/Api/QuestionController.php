<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningSession;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:140'],
            'session_id' => ['nullable', 'integer', 'exists:learning_sessions,id'],
            'status' => ['nullable', Rule::in(['unanswered', 'resolved'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $questions = Question::query()
            ->with(['user:id,name,avatar_path', 'session:id,title,archived', 'session.moderators:id,name'])
            ->withCount('answers')
            ->withExists(['answers as is_resolved' => fn (Builder $query) => $query->where('accepted', true)])
            ->when($filters['q'] ?? null, function (Builder $query, string $term): void {
                $query->where(function (Builder $query) use ($term): void {
                    $query->where('title', 'like', "%{$term}%")
                        ->orWhere('content', 'like', "%{$term}%");
                });
            })
            ->when($filters['session_id'] ?? null, fn (Builder $query, int $sessionId) => $query->where('learning_session_id', $sessionId))
            ->when(($filters['status'] ?? null) === 'unanswered', fn (Builder $query) => $query->whereDoesntHave('answers'))
            ->when(($filters['status'] ?? null) === 'resolved', fn (Builder $query) => $query->whereHas('answers', fn (Builder $answers) => $answers->where('accepted', true)))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return response()->json($questions);
    }

    public function show(Question $question)
    {
        $question->load([
            'user:id,name,avatar_path',
            'session:id,title,archived',
            'session.moderators:id,name',
            'answers' => fn ($query) => $query->with('user:id,name,avatar_path')->orderByDesc('accepted')->oldest(),
        ]);
        $question->loadCount('answers');
        $question->setAttribute('is_resolved', $question->answers->contains('accepted', true));

        return response()->json($question);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'content' => ['required', 'string', 'max:5000'],
            'session_id' => ['nullable', 'integer', 'exists:learning_sessions,id'],
        ]);

        if ($validated['session_id'] ?? null) {
            $session = LearningSession::findOrFail($validated['session_id']);
            abort_if($session->archived, 403, 'Cette séance est archivée.');
        }

        $question = $request->user()->questions()->create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'learning_session_id' => $validated['session_id'] ?? null,
        ]);

        return response()->json($this->present($question), 201);
    }

    public function update(Request $request, Question $question)
    {
        $this->authorizeManage($request->user(), $question, allowOwner: true);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'content' => ['required', 'string', 'max:5000'],
        ]);
        $question->update($validated);

        return response()->json($this->present($question->fresh()));
    }

    public function destroy(Request $request, Question $question)
    {
        $this->authorizeManage($request->user(), $question, allowOwner: true);
        $question->delete();

        return response()->noContent();
    }

    public static function authorizeManage(User $user, Question $question, bool $allowOwner): void
    {
        if ($user->role === 'admin') {
            return;
        }

        if ($allowOwner && $question->user_id === $user->id && ! $question->session?->archived) {
            return;
        }

        if ($question->session && self::isSessionModerator($user, $question->session)) {
            return;
        }

        abort(403, 'Vous n’êtes pas autorisé à modifier ce contenu.');
    }

    public static function canAccept(User $user, Question $question): bool
    {
        return $user->role === 'admin'
            || $question->user_id === $user->id
            || ($question->session && self::isSessionModerator($user, $question->session));
    }

    public static function isSessionModerator(User $user, LearningSession $session): bool
    {
        return $user->role === 'animator'
            && $session->moderators()->whereKey($user->id)->exists();
    }

    private function present(Question $question): Question
    {
        $question->load(['user:id,name,avatar_path', 'session:id,title,archived', 'session.moderators:id,name'])->loadCount('answers');

        return $question->setAttribute('is_resolved', $question->answers()->where('accepted', true)->exists());
    }
}
