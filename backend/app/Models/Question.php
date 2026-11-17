<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = ['title', 'content', 'user_id', 'learning_session_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function session()
    {
        return $this->belongsTo(LearningSession::class, 'learning_session_id');
    }

    public function answers()
    {
        return $this->hasMany(Answer::class);
    }
}
