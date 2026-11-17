<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\LearningSession;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ForumApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_waits_for_admin_approval_before_login(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Nadia Participant',
            'email' => 'nadia@example.test',
            'password' => 'SecurePassword!123',
            'password_confirmation' => 'SecurePassword!123',
        ])->assertAccepted();

        $user = User::where('email', 'nadia@example.test')->firstOrFail();
        $this->assertSame('participant', $user->role);
        $this->assertFalse($user->approved);

        $this->postJson('/api/login', [
            'email' => 'nadia@example.test',
            'password' => 'SecurePassword!123',
        ])->assertForbidden();
    }

    public function test_public_questions_can_be_searched_and_filtered_by_resolution(): void
    {
        $author = User::factory()->create(['approved' => true]);
        $open = Question::create(['title' => 'Comprendre Laravel', 'content' => 'Une question utile', 'user_id' => $author->id]);
        $resolved = Question::create(['title' => 'Angular routing', 'content' => 'Route et navigation', 'user_id' => $author->id]);
        $resolved->answers()->create([
            'content' => 'Une réponse',
            'user_id' => $author->id,
            'accepted' => true,
        ]);

        $this->getJson('/api/questions?q=Laravel&status=unanswered')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $open->id)
            ->assertJsonPath('data.0.is_resolved', false);

        $this->getJson('/api/questions?status=resolved')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $resolved->id)
            ->assertJsonPath('data.0.is_resolved', true);
    }

    public function test_only_question_owner_can_accept_and_only_one_answer_is_accepted(): void
    {
        $author = User::factory()->create(['approved' => true]);
        $other = User::factory()->create(['approved' => true]);
        $question = Question::create(['title' => 'Une question', 'content' => 'Texte', 'user_id' => $author->id]);
        $first = Answer::create(['content' => 'Réponse A', 'user_id' => $other->id, 'question_id' => $question->id]);
        $second = Answer::create(['content' => 'Réponse B', 'user_id' => $other->id, 'question_id' => $question->id]);

        $this->actingAs($other)->postJson("/api/answers/{$first->id}/accept")->assertForbidden();
        $this->actingAs($author)->postJson("/api/answers/{$first->id}/accept")->assertOk();
        $this->actingAs($author)->postJson("/api/answers/{$second->id}/accept")->assertOk();

        $this->assertFalse($first->fresh()->accepted);
        $this->assertTrue($second->fresh()->accepted);
    }

    public function test_animateur_can_moderate_only_assigned_session(): void
    {
        $author = User::factory()->create(['approved' => true]);
        $animator = User::factory()->create(['approved' => true, 'role' => 'animator']);
        $otherAnimator = User::factory()->create(['approved' => true, 'role' => 'animator']);
        $session = LearningSession::create(['title' => 'Séance', 'scheduled_at' => now()]);
        $session->moderators()->attach($animator);
        $question = Question::create([
            'title' => 'Question liée',
            'content' => 'Texte',
            'user_id' => $author->id,
            'learning_session_id' => $session->id,
        ]);

        $this->actingAs($otherAnimator)->deleteJson("/api/questions/{$question->id}")->assertForbidden();
        $this->actingAs($animator)->deleteJson("/api/questions/{$question->id}")->assertNoContent();
    }

    public function test_archived_session_rejects_new_questions_and_answers(): void
    {
        $author = User::factory()->create(['approved' => true]);
        $session = LearningSession::create(['title' => 'Séance archivée', 'scheduled_at' => now(), 'archived' => true]);
        $question = Question::create([
            'title' => 'Question existante',
            'content' => 'Texte',
            'user_id' => $author->id,
            'learning_session_id' => $session->id,
        ]);

        $this->actingAs($author)->postJson('/api/questions', [
            'title' => 'Nouvelle question',
            'content' => 'Texte',
            'session_id' => $session->id,
        ])->assertForbidden();

        $this->actingAs($author)->postJson("/api/questions/{$question->id}/answers", [
            'content' => 'Réponse tardive',
        ])->assertForbidden();
    }

    public function test_user_can_update_display_name_and_change_password_with_current_password(): void
    {
        $user = User::factory()->create(['approved' => true]);

        $this->actingAs($user)->patchJson('/api/profile', [
            'name' => 'Nouveau nom',
            'current_password' => 'password',
            'password' => 'AnotherSecurePassword!456',
            'password_confirmation' => 'AnotherSecurePassword!456',
        ])->assertOk()
            ->assertJsonPath('name', 'Nouveau nom');

        $this->assertTrue(Hash::check('AnotherSecurePassword!456', $user->fresh()->password));
    }

    public function test_user_can_upload_and_view_a_profile_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['approved' => true]);

        $this->actingAs($user)->post('/api/profile', [
            '_method' => 'PATCH',
            'name' => $user->name,
            'avatar' => UploadedFile::fake()->image('profile.png'),
        ])->assertOk()
            ->assertJsonPath('avatar_url', "/api/users/{$user->id}/avatar");

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
        $this->get("/api/users/{$user->id}/avatar")
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_profile_avatar_must_be_a_supported_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['approved' => true]);

        $this->actingAs($user)->post('/api/profile', [
            '_method' => 'PATCH',
            'name' => $user->name,
            'avatar' => UploadedFile::fake()->create('profile.svg', 12, 'image/svg+xml'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('avatar');

        $this->assertNull($user->fresh()->avatar_path);
        Storage::disk('public')->assertDirectoryEmpty('avatars');
    }
}
