<?php

namespace Database\Seeders;

use App\Models\LearningSession;
use App\Models\User;
use Illuminate\Database\Seeder;

class LearningSessionsSeeder extends Seeder
{
    public function run(): void
    {
        $sessions = [
            [
                'title' => 'Développer une API avec Laravel',
                'scheduled_at' => now()->subDays(3)->setTime(16, 0),
                'theme' => 'Backend',
                'description' => 'Routes, contrôleurs, validation et authentification.',
                'archived' => false,
                'moderators' => ['aminata@uidt-ept.test', 'mamadou@uidt-ept.test'],
            ],
            [
                'title' => 'Créer une interface avec Angular',
                'scheduled_at' => now()->addDays(2)->setTime(14, 0),
                'theme' => 'Frontend',
                'description' => 'Composants standalone, formulaires et services HTTP.',
                'archived' => false,
                'moderators' => ['aminata@uidt-ept.test'],
            ],
            [
                'title' => 'Modéliser ses données avec SQL',
                'scheduled_at' => now()->subMonth()->setTime(10, 0),
                'theme' => 'Base de données',
                'description' => 'Relations, clés étrangères et requêtes SQL.',
                'archived' => true,
                'moderators' => ['mamadou@uidt-ept.test'],
            ],
        ];

        foreach ($sessions as $attributes) {
            $moderatorEmails = $attributes['moderators'];
            unset($attributes['moderators']);

            $session = LearningSession::firstOrCreate(
                ['title' => $attributes['title']],
                $attributes,
            );

            if ($session->wasRecentlyCreated) {
                $session->moderators()->sync(
                    User::whereIn('email', $moderatorEmails)->pluck('id'),
                );
            }
        }
    }
}
