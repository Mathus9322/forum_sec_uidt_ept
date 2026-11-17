<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'forum:make-admin {email : Email of an existing account}';

    protected $description = 'Approve an existing account and grant it administrator access';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error('No account was found with that email. Register the account first.');

            return self::FAILURE;
        }

        $user->forceFill(['role' => 'admin', 'approved' => true])->save();
        $this->info("{$user->email} is now an approved administrator.");

        return self::SUCCESS;
    }
}
