<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('Demo data is only seeded in local and testing environments.');

            return;
        }

        $this->call([
            UsersSeeder::class,
            LearningSessionsSeeder::class,
            QuestionsSeeder::class,
        ]);
    }
}
