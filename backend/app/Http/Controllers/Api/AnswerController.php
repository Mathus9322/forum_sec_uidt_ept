<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnswerController extends Controller
{
    public function store(Request $request, Question $question)
    {
        abort_if($question->session?->archived, 403, 'Cette séance est archivée.');
        $validated = $request->validate(['content' => ['required', 'string', 'max:5000']]);

        $answer = $question->answers()->create([
            'content' => $validated['content'],
            'user_id' => $request->user()->id,
        ]);

        return response()->json($answer->load('user:id,name,avatar_path'), 201);
    }

    public function update(Request $request, Answer $answer)
    {
        $this->authorizeManage($request->user(), $answer);
        $validated = $request->validate(['content' => ['required', 'string', 'max:5000']]);
        $answer->update($validated);

        return response()->json($answer->fresh()->load('user:id,name,avatar_path'));
    }

    public function destroy(Request $request, Answer $answer)
    {
        $this->authorizeManage($request->user(), $answer);
        $answer->delete();

        return response()->noContent();
    }

    public function accept(Request $request, Answer $answer)
    {
        DB::transaction(function () use ($request, $answer): void {
            $question = Question::with('session')->whereKey($answer->question_id)->lockForUpdate()->firstOrFail();
            abort_unless(QuestionController::canAccept($request->user(), $question), 403, 'Vous ne pouvez pas accepter une réponse à cette question.');
            abort_if($question->session?->archived && $request->user()->role !== 'admin', 403, 'Cette séance est archivée.');

            $question->answers()->update(['accepted' => false]);
            $answer->forceFill(['accepted' => true])->save();
        });

        return response()->json($answer->fresh()->load('user:id,name,avatar_path'));
    }

    private function authorizeManage(User $user, Answer $answer): void
    {
        $question = $answer->question()->with('session')->firstOrFail();

        if ($user->role === 'admin'
            || ($user->id === $answer->user_id && ! $question->session?->archived)
            || ($question->session && QuestionController::isSessionModerator($user, $question->session))) {
            return;
        }

        abort(403, 'Vous n’êtes pas autorisé à modifier cette réponse.');
    }
}
