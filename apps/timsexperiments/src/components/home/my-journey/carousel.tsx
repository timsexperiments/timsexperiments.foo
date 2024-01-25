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
          <h2 className="font-semibold">Novice</h2>
          <p className="whitespace-normal text-slate-200">
            This is the beginning of my journey. I was a novice, eager to learn
            and grow. I spent countless hours studying and practicing, fueled by
            my passion and curiosity.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="font-semibold">Builder</h2>
          <p className="whitespace-normal text-slate-200">
            This is the beginning of my journey. I was a novice, eager to learn
            and grow. I spent countless hours studying and pract, fueled by my
            passion and curiosity.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="font-semibold">Leader</h2>
          <p className="whitespace-normal text-slate-200">
            This is the beginning of my journey. I was a novice, eager to learn
            and grow. I spent countless hours studying and practicing, fueled by
            my passion and curiosity.
          </p>
        </CarouselItem>
        <CarouselItem>
          <h2 className="font-semibold">Influencer</h2>
          <p className="whitespace-normal text-slate-200">
            This is the beginning of my journey. I was a novice, eager to learn
            and grow. I spent countless hours studying and practicing, fueled by
            my passion and curiosity.
          </p>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default MyJourneyCarousel;
