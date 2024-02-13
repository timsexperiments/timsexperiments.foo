import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export const MyJourneyCarousel = () => {
  return (
    <Carousel
      opts={{ containScroll: 'keepSnaps', loop: true }}
      orientation="horizontal">
      <CarouselContent>
        <CarouselItem>
          <h2 className="pb-2 font-semibold">Overview</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            My journey is a tale of continuous learning and evolving skill in
            crafting innovative solutions. Starting in consulting, I adapted to
            diverse methods and environments, honing a wide range of
            problem-solving techniques. Eventually, this path led me to lead
            projects at Google, where I lead initiatives with multi-million
            dollar impact. Through it all, I have had the pleasure of working on
            products with hundreds of users to platforms with millions of users.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="pb-2 font-semibold">Novice</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            My first steps in software engineering were in the dynamic world of
            consulting. It was a rollercoaster of learning new tech and meeting
            tight deadlines, which really accelerated my growth. Those early
            days were a mix of fast-paced learning and real-world application,
            setting the stage for my journey as a software engineer who thrives
            under pressure.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="pb-2 font-semibold">Novice</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            My first steps in software engineering were in the dynamic world of
            consulting. It was a rollercoaster of learning new tech and meeting
            tight deadlines, which really accelerated my growth. Those early
            days were a mix of fast-paced learning and real-world application,
            setting the stage for my journey as a software engineer who thrives
            under pressure.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="pb-2 font-semibold">Builder</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            Gaining confidence in tackling complex challenges, I specialized in
            quickly designing and implementing targeted features. My background
            in consulting provided a foundation for understanding varied
            problems and crafting effective, precise solutions. This phase was
            defined by my ability to turn complex requirements into streamlined,
            impactful software and guide newer developers in their journeys.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="pb-2 font-semibold">Leader</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            Progressing from designing features to architecting large-scale
            initiatives, I took the helm of cross-team projects with significant
            organizational impact. My engagement was deeply rooted in
            engineering, focusing on technical design and development for a key
            set of products. At the same time, I steered collaboration among
            various teams, ensuring a cohesive approach that aligned with our
            collective objectives and drove innovative solutions.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="font-semibold">Influencer</h2>
          <p className="h-full overflow-auto whitespace-normal text-rhino-700 dark:text-rhino-200">
            In this phase of my career, I shifted my focus from specific
            products to broad business areas, identifying and spearheading
            initiatives to drive organizational growth. This wasn't just about
            designing within existing scopes; it was about innovatively charting
            new territories and creating impactful projects. My role involved
            analyzing the business landscape, pinpointing areas for
            optimization, and leading efforts that enhance efficiency and
            significantly boost revenue.
          </p>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default MyJourneyCarousel;
