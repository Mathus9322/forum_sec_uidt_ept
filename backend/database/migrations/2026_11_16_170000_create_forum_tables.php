<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('title', 140);
            $table->dateTime('scheduled_at');
            $table->string('theme')->nullable();
            $table->text('description')->nullable();
            $table->boolean('archived')->default(false);
            $table->timestamps();
        });

        Schema::create('session_moderators', function (Blueprint $table) {
            $table->foreignId('learning_session_id')->constrained('learning_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['learning_session_id', 'user_id']);
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->string('title', 140);
            $table->text('content');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('learning_session_id')->nullable()->constrained('learning_sessions')->nullOnDelete();
            $table->timestamps();
            $table->index(['learning_session_id', 'created_at']);
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->text('content');
            $table->boolean('accepted')->default(false);
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->index(['question_id', 'accepted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('session_moderators');
        Schema::dropIfExists('learning_sessions');
    }
};
