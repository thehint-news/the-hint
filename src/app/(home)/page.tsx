/**
 * Homepage
 * 
 * The Hint - A Classic Broadsheet Newspaper Homepage
 * 
 * LAYOUT STRUCTURE:
 * 1. TOP MASTHEAD - Centered "THE HINT" with navigation
 * 2. LEAD STORY - Full-width dominant story
 * 3. SECONDARY LEADS - Two column stories
 * 4. CRIME & COURT - Split view layout (side by side)
 * 5. MID-PAGE: Politics (Left) + World Affairs (Right)
 * 6. OPINION & ANALYSIS - Four columns
 * 7. FOOTER - Institutional dark footer
 * 
 * All editorial selection logic is handled by getHomepageData().
 * This component only handles rendering and layout.
 */


import { getHomepageData } from "@/lib/content/homepage";
import { LeadStory, TopStories, SectionBlock } from "@/components/editorial";

// Revalidate homepage every 60 seconds
export const revalidate = 60;

export default function HomePage() {
  // Get all homepage data in a single call
  const { leadStory, topStories, sections } = getHomepageData();

  return (
    <main id="main-content" className="flex-1">
      {/* 2. LEAD STORY */}
      <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "1.5rem" }}>
        <LeadStory article={leadStory} />
      </div>
      <hr className="full-width-divider" />

      {/* 3. SECONDARY LEADS */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
        <TopStories articles={topStories} />
      </div>
      <hr className="full-width-divider" />

      {/* 4. CRIME & COURT */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
        <div className="grid-12">
          {/* Left: Crime Section */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle="Crime"
              articles={sections.crime}
            />
          </div>

          {/* Right: Court Section */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle="Court"
              articles={sections.court}
            />
          </div>
        </div>
      </div>
      <hr className="full-width-divider" />

      {/* 5. MID-PAGE SECTIONS */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
        <div className="grid-12">
          {/* Left: Politics - Vertical List */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle="Politics"
              articles={sections.politics}
            />
          </div>

          {/* Right: World Affairs - Two Column Image-Led */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle="World Affairs"
              articles={sections.worldAffairs}
            />
          </div>
        </div>
      </div>
      <hr className="full-width-divider" />

      {/* 6. OPINION & ANALYSIS */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <SectionBlock
          sectionTitle="Opinion & Analysis"
          articles={sections.opinion}
        />
      </div>


    </main>
  );
}
