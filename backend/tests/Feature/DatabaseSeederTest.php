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
    }
}
