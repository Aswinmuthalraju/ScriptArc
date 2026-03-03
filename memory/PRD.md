# ScriptArc - Product Requirements Document

## Original Problem Statement
ScriptArc is a gamified, mentor-supported, performance-driven interactive coding learning platform that transforms passive video learning into an enforced active learning experience.

## Architecture Overview
- **Frontend**: React 19 with Tailwind CSS, shadcn/ui components, Monaco Editor for code editing
- **Backend**: FastAPI with Motor (async MongoDB driver)
- **Database**: MongoDB
- **Code Execution**: Judge0 API integration (mock mode available)
- **Authentication**: JWT-based custom auth

## Core Requirements (Static)
1. Video + Timestamp Challenge System
2. 5-Star Skill Rating System (based on attempts, hints usage)
3. Smart Hint System (progressive, limited)
4. Learning Streaks & Gamification
5. Mentor Dashboard with student tracking
6. Performance-based Certification
7. Global Leaderboard (public/private visibility option)
8. Badge System

## User Personas
1. **Students**: Self-learners wanting structured coding practice with measurable progress
2. **Mentors**: Teachers/instructors tracking student performance and guiding improvement

## What's Been Implemented (March 3, 2026)
### Backend (server.py)
- [x] User authentication (register, login, JWT tokens)
- [x] Course, Module, Lesson, Challenge CRUD
- [x] Code submission to Judge0 with star calculation
- [x] Hint system with progressive unlocking
- [x] Badge system (First Try Master, No Hint Hero, 7 Day Streak, Star Collector)
- [x] Leaderboard (global and course-specific)
- [x] Mentor dashboard with student analytics
- [x] Streak tracking
- [x] Certificate generation based on performance
- [x] Seed data for demo courses

### Frontend
- [x] Landing page with animated gradient background
- [x] Auth pages (Login/Register with role selection)
- [x] Dashboard (stats, progress, badges, quick actions)
- [x] Courses listing with search and level filtering
- [x] Single course page with curriculum and enrollment
- [x] Learn page with video player and code editor
- [x] Leaderboard with podium display
- [x] Profile page with settings and stats

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] QuickRev system (periodic reinforcement tests after 2 modules)
- [ ] Final Assessment system for course completion
- [ ] Video upload functionality for mentors

### P1 (High Priority)
- [ ] Course creation UI for mentors
- [ ] Student assignment to mentors
- [ ] Certificate PDF generation
- [ ] Mobile responsive improvements

### P2 (Medium Priority)
- [ ] Real-time code execution with actual Judge0 API
- [ ] Code editor improvements (multiple file support)
- [ ] Progress analytics charts
- [ ] Email notifications

### P3 (Nice to Have)
- [ ] Team competitions
- [ ] Weekly tournaments
- [ ] Social sharing of certificates
- [ ] Dark/light theme toggle

## Next Tasks (Immediate)
1. Configure Judge0 API key for real code execution
2. Implement QuickRev tests
3. Add video upload UI for mentors
4. Create course builder interface
5. Generate PDF certificates
