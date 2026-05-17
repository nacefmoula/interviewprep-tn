-- V3__seed_questions.sql
INSERT INTO questions (text, type, industry, difficulty, expected_method, sample_answer, avg_answer_time_seconds, avg_score_on_platform, times_used, is_active) VALUES

-- BEHAVIORAL / IT_TECH
('Tell me about a time you dealt with a production incident under pressure.', 'BEHAVIORAL', 'IT_TECH', 'MID', 'STAR method', 'Describe the incident, your role, actions taken, and outcome with metrics.', 120, 72.5, 0, true),
('Describe a situation where you had to learn a new technology quickly.', 'BEHAVIORAL', 'IT_TECH', 'JUNIOR', 'STAR method', 'Focus on the learning process, resources used, and result delivered.', 90, 68.0, 0, true),
('Give an example of a time you disagreed with a technical decision and how you handled it.', 'BEHAVIORAL', 'IT_TECH', 'MID', 'STAR method', 'Show communication skills and respect for team decisions.', 110, 70.0, 0, true),

-- TECHNICAL / IT_TECH
('Explain the difference between REST and GraphQL and when you would choose each.', 'TECHNICAL', 'IT_TECH', 'MID', 'Concept explanation', 'REST is resource-based; GraphQL allows flexible queries. Choose GraphQL for complex client needs.', 90, 75.0, 0, true),
('What is the CAP theorem and how does it affect distributed system design?', 'TECHNICAL', 'IT_TECH', 'SENIOR', 'Concept explanation', 'Consistency, Availability, Partition Tolerance — only two can be guaranteed simultaneously.', 120, 78.0, 0, true),
('How would you design a rate limiter for an API?', 'TECHNICAL', 'IT_TECH', 'SENIOR', 'System design', 'Token bucket or sliding window approach, Redis-backed counter, per-user or per-IP.', 150, 74.0, 0, true),
('What are the SOLID principles? Give one example for each.', 'TECHNICAL', 'IT_TECH', 'MID', 'Concept explanation', 'SRP, OCP, LSP, ISP, DIP with concrete Java examples.', 120, 71.0, 0, true),

-- BEHAVIORAL / FINANCE
('Tell me about a time you identified a financial risk before it became a problem.', 'BEHAVIORAL', 'FINANCE', 'MID', 'STAR method', 'Show analytical skills and proactive thinking.', 120, 69.0, 0, true),
('Describe a situation where you had to explain complex financial data to a non-technical audience.', 'BEHAVIORAL', 'FINANCE', 'JUNIOR', 'STAR method', 'Emphasize simplification and visual aids used.', 100, 67.0, 0, true),

-- TECHNICAL / FINANCE
('What is the difference between IFRS and GAAP?', 'TECHNICAL', 'FINANCE', 'MID', 'Concept explanation', 'IFRS is principles-based; GAAP is rules-based. Key differences in revenue recognition and leases.', 90, 73.0, 0, true),
('How do you calculate EBITDA and why is it used?', 'TECHNICAL', 'FINANCE', 'JUNIOR', 'Concept explanation', 'Earnings Before Interest, Taxes, Depreciation, Amortization — proxy for operating cash flow.', 80, 70.0, 0, true),

-- BEHAVIORAL / HEALTH
('Tell me about a challenging patient case and how you coordinated care.', 'BEHAVIORAL', 'HEALTH', 'MID', 'STAR method', 'Focus on interdisciplinary communication and patient-centered outcome.', 120, 71.5, 0, true),
('Describe a time you had to make a critical decision with incomplete information.', 'BEHAVIORAL', 'HEALTH', 'SENIOR', 'STAR method', 'Show risk assessment, communication with team, and follow-up.', 110, 73.0, 0, true),

-- TECHNICAL / HEALTH
('What is the difference between sensitivity and specificity in diagnostic tests?', 'TECHNICAL', 'HEALTH', 'MID', 'Concept explanation', 'Sensitivity = true positive rate; Specificity = true negative rate. Trade-off depends on clinical context.', 90, 75.0, 0, true),

-- CASE_STUDY / CONSULTING
('A retail client has seen a 20% revenue drop in 6 months. How do you approach this?', 'CASE_STUDY', 'CONSULTING', 'MID', 'MECE framework', 'Segment revenue streams, analyze internal vs external causes, benchmark competitors.', 300, 76.0, 0, true),
('Your client wants to enter a new market. Walk me through your analysis.', 'CASE_STUDY', 'CONSULTING', 'SENIOR', 'Market sizing', 'Market size, competitive landscape, regulatory context, required capabilities, go-to-market.', 300, 78.0, 0, true),

-- BEHAVIORAL / CONSULTING
('Tell me about a time you managed a difficult stakeholder during a project.', 'BEHAVIORAL', 'CONSULTING', 'MID', 'STAR method', 'Show communication strategy, expectation management, and result.', 110, 70.0, 0, true),

-- BEHAVIORAL / ENGINEERING
('Describe a project where you had to balance technical excellence with delivery speed.', 'BEHAVIORAL', 'ENGINEERING', 'MID', 'STAR method', 'Show trade-off thinking and outcome.', 120, 69.5, 0, true),

-- TECHNICAL / ENGINEERING
('Explain the difference between stress, strain, and Young''s modulus.', 'TECHNICAL', 'ENGINEERING', 'JUNIOR', 'Concept explanation', 'Stress = force/area; Strain = deformation/original length; Young''s modulus = stress/strain.', 90, 72.0, 0, true),

-- BEHAVIORAL / SALES_MARKETING
('Tell me about your most successful sales deal and what made it work.', 'BEHAVIORAL', 'SALES_MARKETING', 'MID', 'STAR method', 'Highlight discovery, pitch tailoring, objection handling, and closing.', 120, 71.0, 0, true),
('Describe a campaign you ran that underperformed. What did you learn?', 'BEHAVIORAL', 'SALES_MARKETING', 'JUNIOR', 'STAR method', 'Show analytical mindset and ability to extract learnings from failure.', 100, 67.5, 0, true);