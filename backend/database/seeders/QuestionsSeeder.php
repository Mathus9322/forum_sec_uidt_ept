<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\LearningSession;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Seeder;

class QuestionsSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            [
                'title' => 'Comment valider les données d’une requête Laravel ?',
                'content' => 'Je crée mon premier formulaire et je veux vérifier les champs côté serveur avant de les enregistrer. Quelle est la méthode recommandée ?',
                'author' => 'fatou@uidt-ept.test',
                'session' => 'Développer une API avec Laravel',
                'answers' => [
                    ['author' => 'ibrahima@uidt-ept.test', 'content' => 'Utilise $request->validate([...]) dans ton contrôleur : Laravel renverra automatiquement les erreurs de validation.', 'accepted' => true],
                    ['author' => 'aminata@uidt-ept.test', 'content' => 'Pour des règles plus complexes, une Form Request dédiée permet aussi de centraliser validation et autorisation.', 'accepted' => false],
                ],
            ],
            [
                'title' => 'Quand utiliser un service Angular ?',
                'content' => 'Je dois charger des données depuis une API et les afficher dans plusieurs composants. Où placer les appels HTTP ?',
                'author' => 'ibrahima@uidt-ept.test',
                'session' => 'Créer une interface avec Angular',
                'answers' => [
                    ['author' => 'fatou@uidt-ept.test', 'content' => 'Un service injectable est un bon endroit pour encapsuler les appels HTTP et les partager entre composants.', 'accepted' => false],
                ],
            ],
            [
                'title' => 'À quoi sert une clé étrangère ?',
                'content' => 'Comment garantir qu’une réponse est toujours liée à une question existante dans la base ?',
                'author' => 'fatou@uidt-ept.test',
                'session' => 'Modéliser ses données avec SQL',
                'answers' => [],
            ],
            [
                'title' => 'Comment organiser son temps de révision ?',
                'content' => 'Avez-vous des conseils pour répartir les exercices entre deux séances ?',
                'author' => 'ibrahima@uidt-ept.test',
                'session' => null,
                'answers' => [],
            ],
        ];

        foreach ($questions as $attributes) {
            $authorEmail = $attributes['author'];
            $sessionTitle = $attributes['session'];
            $answers = $attributes['answers'];
            unset($attributes['author'], $attributes['session'], $attributes['answers']);

            $question = Question::updateOrCreate(
                [
                    'title' => $attributes['title'],
                    'user_id' => User::where('email', $authorEmail)->value('id'),
                ],
                [
                    ...$attributes,
                    'learning_session_id' => $sessionTitle
                        ? LearningSession::where('title', $sessionTitle)->value('id')
                        : null,
                ],
            );

            foreach ($answers as $answerAttributes) {
                Answer::updateOrCreate(
                    [
                        'question_id' => $question->id,
                        'user_id' => User::where('email', $answerAttributes['author'])->value('id'),
                    ],
                    [
                        'content' => $answerAttributes['content'],
                        'accepted' => false,
                    ],
                );
            }

            $acceptedAnswer = collect($answers)->firstWhere('accepted', true);
            if ($acceptedAnswer) {
                $question->answers()->update(['accepted' => false]);
                $question->answers()
                    ->where('user_id', User::where('email', $acceptedAnswer['author'])->value('id'))
                    ->update(['accepted' => true]);
            }
        }
    }
}
