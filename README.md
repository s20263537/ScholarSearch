# ScholarSearch

My friend, judaea Stjohn, and I, Aarav Mathur, built **ScholarSearch** for the Congressional App Challenge (CAC) to make finding financial aid and scholarships way less stressful for high school students nationwide. 

Most scholarship websites are super cluttered, full of expired links, or impossible to navigate. We wanted to create a clean, modern hub where students can easily plug in their academic profile, test scores, and goals to instantly discover and filter funding opportunities they are actually eligible for.

## What it does
- **Smart Onboarding Quiz & Profile Manager:** Captures student stats (GPA, test scores, grade level, state, volunteer/work hours, and financial need) with full support for editing or omitting criteria at any time.
- **Dynamic Scholarship Feed:** Automatically filters and ranks opportunities based on true student eligibility, letting you sort by match percentage, award amount, or deadlines in both directions.
- **Saved Awards Pipeline:** Tracks your applications across different stages (Bookmarked, In Progress, Submitted, Awarded) with a full financial aid tally.
- **Financial Aid & FAFSA Calculator:** Helps students estimate college costs, expected family contributions, and planning their budgeting.
- **Built-in AI Assistant:** Powered by Gemini to provide quick, helpful guidance on essays, recommendations, and financial aid.

## Running it locally

If you want to check out or run the code on your own machine:

1. Clone the repo:
   git clone https://github.com/s20263537/ScholarSearch.git
   cd ScholarSearch

2. Install the dependencies:
   npm install

3. Set up your environment variables:
   Copy .env.example to .env and add your API keys.

4. Fire it up:
   npm run dev