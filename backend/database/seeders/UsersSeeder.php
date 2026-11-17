<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Administration UIDT-EPT', 'email' => 'admin@uidt-ept.test', 'role' => 'admin'],
            ['name' => 'Aminata Diop', 'email' => 'aminata@uidt-ept.test', 'role' => 'animator'],
            ['name' => 'Mamadou Fall', 'email' => 'mamadou@uidt-ept.test', 'role' => 'animator'],
            ['name' => 'Fatou Ndiaye', 'email' => 'fatou@uidt-ept.test', 'role' => 'participant'],
            ['name' => 'Ibrahima Ba', 'email' => 'ibrahima@uidt-ept.test', 'role' => 'participant'],
        ];

        foreach ($users as $attributes) {
            User::firstOrCreate(
                ['email' => $attributes['email']],
                [
                    ...$attributes,
                    'approved' => true,
                    'password' => 'password',
                ],
            );
        }
    }
}
