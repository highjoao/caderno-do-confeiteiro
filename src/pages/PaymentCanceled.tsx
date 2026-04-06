import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Pagamento Cancelado</CardTitle>
          <CardDescription>
            O pagamento não foi concluído. Você precisa pagar para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => navigate("/payment-required")} className="w-full">
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
            Voltar ao Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCanceled;
