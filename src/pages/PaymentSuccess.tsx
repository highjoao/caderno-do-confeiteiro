import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { refreshPerfil } = useAuth();

  useEffect(() => {
    // Refresh profile to pick up is_paid = true
    refreshPerfil();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado! 🎉</CardTitle>
          <CardDescription>
            Seu acesso ao Caderno do Confeiteiro foi liberado com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/")} className="w-full">
            Acessar o Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
