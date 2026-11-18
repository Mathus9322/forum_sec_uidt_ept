<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        $production = app()->environment('production');
        $adminEmail = $production ? config('app.seed_admin_email') : 'admin@uidt-ept.test';
        $adminPassword = $production ? config('app.seed_admin_password') : 'password';

        if ($production && (! is_string($adminEmail) || filter_var($adminEmail, FILTER_VALIDATE_EMAIL) === false
            || ! is_string($adminPassword) || strlen($adminPassword) < 16)) {
            throw new RuntimeException('SEED_ADMIN_EMAIL must be valid and SEED_ADMIN_PASSWORD must contain at least 16 characters in production.');
        }

        $users = [
            ['name' => 'Administration UIDT-EPT', 'email' => $adminEmail, 'role' => 'admin'],
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
                    'password' => $production && $attributes['role'] !== 'admin'
                        ? Str::random(64)
                        : $adminPassword,
                ],
            );
        }
    }
}
