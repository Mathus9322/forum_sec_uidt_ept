<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\LearningSession;
use App\Models\Question;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeders_are_repeatable_and_create_a_usable_forum(): void
    {
        app(DatabaseSeeder::class)->run();
        $session = LearningSession::firstOrFail();
        $question = Question::firstOrFail();
        $answer = Answer::firstOrFail();
        $session->update(['description' => 'Description personnalisée']);
        $question->update(['content' => 'Contenu personnalisé']);
        $answer->update(['content' => 'Réponse personnalisée']);

        app(DatabaseSeeder::class)->run();

        $this->assertSame(5, User::count());
        $this->assertSame(3, LearningSession::count());
        $this->assertSame(4, Question::count());
        $this->assertSame(3, Answer::count());

        $this->assertDatabaseHas('users', [
            'email' => 'admin@uidt-ept.test',
            'role' => 'admin',
            'approved' => true,
        ]);
        $this->assertTrue(password_verify('password', User::where('email', 'admin@uidt-ept.test')->value('password')));
        $this->assertSame(1, Answer::where('accepted', true)->count());
        $this->assertSame('Description personnalisée', $session->fresh()->description);
        $this->assertSame('Contenu personnalisé', $question->fresh()->content);
        $this->assertSame('Réponse personnalisée', $answer->fresh()->content);
    }

    public function test_production_seeds_demo_data_with_configured_admin_credentials(): void
    {
        $this->app['env'] = 'production';
        config([
            'app.seed_admin_email' => 'forum-admin@example.com',
            'app.seed_admin_password' => 'A-long-production-password-2026',
        ]);

        app(DatabaseSeeder::class)->run();
        app(DatabaseSeeder::class)->run();

        $this->assertSame(5, User::count());
        $this->assertSame(3, LearningSession::count());
        $this->assertSame(4, Question::count());
        $this->assertSame(3, Answer::count());

        $admin = User::where('email', 'forum-admin@example.com')->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertTrue(password_verify('A-long-production-password-2026', $admin->password));
        $this->assertFalse(password_verify('password', User::where('email', 'aminata@uidt-ept.test')->value('password')));
    }

    public function test_production_seeding_requires_secure_admin_credentials(): void
    {
        $this->app['env'] = 'production';
        config(['app.seed_admin_email' => null, 'app.seed_admin_password' => null]);

        try {
            app(DatabaseSeeder::class)->run();
            $this->fail('Production seeding should require admin credentials.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('SEED_ADMIN_EMAIL', $exception->getMessage());
        }

        $this->assertSame(0, User::count());
    }
}
