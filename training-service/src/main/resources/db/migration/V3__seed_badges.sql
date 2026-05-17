-- V3__seed_badges.sql
-- Seed initial badges for the badge catalog

INSERT INTO badges (name, description, icon, category, xp_reward, is_active)
VALUES
    -- SIMULATION badges
    ('First Interview', 'Complete your first mock interview', '🎬', 'SIMULATION', 50, true),
    ('Interview Veteran', 'Complete 10 mock interviews', '🎓', 'SIMULATION', 250, true),
    ('Hundred Strong', 'Complete 100 mock interviews', '💪', 'SIMULATION', 1000, true),
    
    -- COMMUNITY badges
    ('Community Member', 'Post your first community contribution', '👥', 'COMMUNITY', 25, true),
    ('Helpful Soul', 'Help 10 community members', '🤝', 'COMMUNITY', 150, true),
    ('Mentor Extraordinaire', 'Complete 5 mentoring sessions', '🌟', 'COMMUNITY', 300, true),
    
    -- STREAK badges
    ('Consistent Learner', 'Maintain a 7-day learning streak', '🔥', 'STREAK', 100, true),
    ('Unstoppable', 'Maintain a 30-day learning streak', '⚡', 'STREAK', 500, true),
    ('Century Streak', 'Maintain a 100-day learning streak', '🏆', 'STREAK', 2000, true),
    
    -- PERFORMANCE badges
    ('Perfect Score', 'Achieve 100% on any mock interview', '⭐', 'PERFORMANCE', 200, true),
    ('Rising Star', 'Improve your score by 50+ points', '📈', 'PERFORMANCE', 150, true),
    ('Master Level', 'Reach Master preparation level', '👑', 'PERFORMANCE', 1000, true),
    
    -- MILESTONE badges
    ('Resourceful', 'Save 5 library resources', '📚', 'MILESTONE', 75, true),
    ('Quiz Champion', 'Score 80%+ on 5 quizzes', '🎯', 'MILESTONE', 200, true),
    ('Speed Reader', 'Complete 10 library resources', '📖', 'MILESTONE', 150, true),
    ('Dedicated Learner', 'Earn 10,000 XP', '💎', 'MILESTONE', 500, true);

-- Verify insertion
SELECT COUNT(*) as badge_count FROM badges;
