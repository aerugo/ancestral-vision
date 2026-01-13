import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Ancestral Vision</h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          Transform your family tree into a living 3D constellation. Fly through
          generations and discover your ancestry like never before.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
