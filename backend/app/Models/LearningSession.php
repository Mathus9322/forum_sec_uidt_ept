<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningSession extends Model
{
    protected $fillable = ['title', 'scheduled_at', 'theme', 'description', 'archived'];

    protected function casts(): array
    {
        return ['scheduled_at' => 'datetime', 'archived' => 'boolean'];
    }

    public function moderators()
    {
        return $this->belongsToMany(User::class, 'session_moderators');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'learning_session_id');
    }
}
