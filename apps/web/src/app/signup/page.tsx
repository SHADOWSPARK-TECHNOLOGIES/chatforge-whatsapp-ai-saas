import { MarketingHeader } from '@/components/marketing-header';
import { AuthForm } from '@/components/auth-form';

export default function SignupPage() {
  return (
    <div>
      <MarketingHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
