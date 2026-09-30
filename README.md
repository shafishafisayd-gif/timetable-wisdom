# Malja'a Timetable Hub

This is time table for teachers in our college Malja'a and the new TT 3.pdf is the overall time table and there is teacher name and there colour and periods and class wise break down for each teacher is the second pdf.

Buid the Malja'a Teachers Timetable Web App

Create a modern, responsive Progressive Web App (PWA) for Malja'a Shareeath & Arts College using the attached timetable PDFs as the only source of timetable data. Read and extract all information automatically from both PDFs.

The app must be mobile-first, fast, elegant, and work perfectly on Android, desktop, and tablets.

Use the teacher-wise PDF for each teacher's schedule and the overall timetable PDF for daily and class-wise views.

Design Style

Modern Islamic academic theme.

Primary Color:
Deep Blue (#1F4E79)

Secondary:
White

Accent:
Green

Cards:
Rounded rectangle (20px radius)

Soft shadows

Smooth animations

Professional typography

Responsive layout

No emojis

Home Page

Display all teachers as large rounded cards.

Each card contains:

• Teacher photo placeholder

• Full teacher name

• Short name (HU, AJR, SSH, etc.)

• Color badge matching timetable

• Position (Usthad)

• Total Weekly Periods

• Total Classes Assigned

• Today's Remaining Periods

• Current Status

Teaching Now

Free Now

Break

Prayer Break

Finished for Today

Search teachers instantly.

Filter by teacher.

Favorite teachers.

Teacher Profile Page

Clicking a teacher opens a detailed profile.

Show

Teacher Name

Teacher Code

Weekly Statistics

Total Weekly Periods

Periods Per Day

Total Classes

Subjects Teaching

Free Periods

Teaching Hours

Workload percentage

Weekly Timetable

Display a beautiful timetable.

Columns

Period 1 to Period 9

Rows

Saturday to Thursday

Each class shown as a colorful card.

Display

Class

Subject

Time

Room (future support)

Color from timetable

Blank periods become

FREE

Today's Timetable

Automatically detect today's weekday.

When the app opens it should directly highlight today's schedule.

Example

If today is Tuesday

Automatically show Tuesday timetable first.

Highlight

Current Period

Next Period

Completed Periods

Upcoming Periods

Current class

Countdown until next period

Time remaining

Live Current Period Widget

Large card on top.

Example

Now Teaching

Class S5

Subject Fiqh

Period 5

10:20 AM to 11:00 AM

Next

Period 6

S4 Nahvu

If free

Display

Free Period

If break

Display

Breakfast Break

Interval

Prayer Break

Finished

Daily Timeline

Visual timeline

5:50 AM

↓

Period 1

↓

Break

↓

Period 2

↓

Breakfast

↓

Period 4

↓

Interval

↓

Prayer

↓

Period 8

↓

Period 9

Highlight current position.

Overall College Timetable

Separate page.

Exactly recreate the overall timetable from the PDF.

Allow switching

Saturday

Sunday

Monday

Tuesday

Wednesday

Thursday

Only today's timetable opens first automatically.

Swipe left/right to change day.

Zoom support.

Sticky header.

Class Wise View

Display

S1

S2

S3

S4

S5

S6

S7

Click class.

Show

All periods

Teacher

Subject

Color

Time

Total periods

Daily statistics

Teacher Workload

Dashboard showing

Weekly Period Count

Daily Period Count

Free Period Count

Teaching Hours

Subject Distribution

Classes Assigned

Most Busy Teacher

Least Busy Teacher

Subject Summary

Each teacher

Subjects taught

Weekly frequency

Class distribution

Subject colors

Statistics Dashboard

Cards

Total Teachers

Total Classes

Total Subjects

Total Weekly Periods

Total Teaching Hours

Average Daily Periods

Teacher with Highest Load

Teacher with Lowest Load

Most Used Subject

Smart Search

Search by

Teacher

Class

Subject

Teacher Code

Filters

Teacher

Class

Subject

Day

Period

Period Details

Click any period.

Open popup showing

Teacher

Subject

Class

Day

Period

Time

Duration

Teacher Color

Notifications

Optional future support.

Notify

Next Period starts in 10 minutes

Prayer break

Breakfast break

Settings

Dark Mode

Light Mode

Language

English

Arabic

Malayalam

Auto Theme

Font Size

PWA Features

Installable

Offline Support

Fast Loading

Local Storage

No backend required

Responsive

Perfect on

Mobile

Tablet

Desktop

Landscape

Portrait

Future Ready

Structure code so future features can be added easily:

Teacher login

Attendance

Leave Management

Substitution timetable

Exam timetable

Holiday calendar

Push notifications

Google Calendar sync

Admin panel

PDF Extraction Rules

Read every timetable from both uploaded PDFs.

Automatically identify:

Teacher names

Teacher codes

Subject names

Class names

Period timings

Teacher colors

Day-wise schedules

Weekly summaries

No manual data entry should be required.

If any text cannot be extracted automatically from the PDFs, use OCR and preserve all timetable data accurately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://timetable-wisdom.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/215f55b6-9e8b-4082-b683-31680a8092c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
