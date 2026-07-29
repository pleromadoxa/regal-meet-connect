import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRODUCT_NAME } from '@/constants/site';

interface LandingCtaProps {
  isAuthenticated?: boolean;
}

export const LandingCta = ({ isAuthenticated = false }: LandingCtaProps) => {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-[#1a0d2e] to-purple-600/20 p-8 text-center sm:p-12 lg:p-16">
        <div className="landing-hero-glow absolute inset-0 opacity-40 blur-3xl" aria-hidden />
        <div className="relative">
          <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Ready for your next {PRODUCT_NAME}?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/55 sm:text-base">
            Start a room in seconds or jump into an invite — same premium experience every time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="premium"
              size="lg"
              className="min-w-[200px] rounded-xl"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
            >
              {isAuthenticated ? 'Open dashboard' : 'Start for free'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-w-[200px] rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            >
              I have a code
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
