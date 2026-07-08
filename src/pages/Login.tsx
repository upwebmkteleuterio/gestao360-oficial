import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';

export default function Login() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-on-background">
            Gestão 360
          </h2>
          <p className="mt-2 text-sm text-secondary font-medium uppercase tracking-wider">
            Verdade Bancária Integrada
          </p>
        </div>

        <div className="bg-surface p-8 rounded-2xl border border-surface-border shadow-xl">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#795900',
                    brandAccent: '#6c5000',
                    brandButtonText: '#ffffff',
                    defaultButtonBackground: '#ffffff',
                    defaultButtonBackgroundHover: '#f3f3f3',
                    inputBackground: '#ffffff',
                    inputBorder: '#E0E0E0',
                    inputLabelText: '#5e5e5e',
                    inputText: '#1a1c1c',
                  },
                  space: {
                    buttonPadding: '12px 16px',
                    inputPadding: '12px 16px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Endereço de e-mail',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  email_input_placeholder: 'Seu endereço de e-mail',
                  password_input_placeholder: 'Sua senha',
                  link_text: 'Já tem uma conta? Entre',
                },
                sign_up: {
                  email_label: 'Endereço de e-mail',
                  password_label: 'Senha',
                  button_label: 'Cadastrar',
                  loading_button_label: 'Cadastrando...',
                  email_input_placeholder: 'Seu endereço de e-mail',
                  password_input_placeholder: 'Sua senha',
                  link_text: 'Não tem uma conta? Cadastre-se',
                },
                forgotten_password: {
                  email_label: 'Endereço de e-mail',
                  password_label: 'Senha',
                  button_label: 'Enviar instruções de recuperação',
                  loading_button_label: 'Enviando instruções...',
                  email_input_placeholder: 'Seu endereço de e-mail',
                  link_text: 'Esqueceu sua senha?',
                },
              },
            }}
            providers={[]}
            view="sign_in"
            showLinks={false}
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-secondary font-medium">
            © {new Date().getFullYear()} Gestão 360 - Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
