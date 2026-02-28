export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      base_insumos: {
        Row: {
          base_id: string
          criado_em: string
          id: string
          insumo_id: string
          quantidade_usada: number
        }
        Insert: {
          base_id: string
          criado_em?: string
          id?: string
          insumo_id: string
          quantidade_usada: number
        }
        Update: {
          base_id?: string
          criado_em?: string
          id?: string
          insumo_id?: string
          quantidade_usada?: number
        }
        Relationships: [
          {
            foreignKeyName: "base_insumos_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "base_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          criado_em: string
          custo_por_rendimento: number | null
          custo_total: number
          empresa_id: string
          id: string
          nome: string
          rendimento_quantidade: number | null
          rendimento_unidade: string | null
        }
        Insert: {
          criado_em?: string
          custo_por_rendimento?: number | null
          custo_total?: number
          empresa_id: string
          id?: string
          nome: string
          rendimento_quantidade?: number | null
          rendimento_unidade?: string | null
        }
        Update: {
          criado_em?: string
          custo_por_rendimento?: number | null
          custo_total?: number
          empresa_id?: string
          id?: string
          nome?: string
          rendimento_quantidade?: number | null
          rendimento_unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes: {
        Row: {
          criado_em: string
          dia_fechamento: number
          dia_vencimento: number
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          dia_fechamento: number
          dia_vencimento: number
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          dia_fechamento?: number
          dia_vencimento?: number
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_fixos: {
        Row: {
          criado_em: string
          dia_vencimento: number
          empresa_id: string
          id: string
          nome: string
          observacao: string | null
          valor: number
        }
        Insert: {
          criado_em?: string
          dia_vencimento: number
          empresa_id: string
          id?: string
          nome: string
          observacao?: string | null
          valor: number
        }
        Update: {
          criado_em?: string
          dia_vencimento?: number
          empresa_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_fixos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      encomenda_produtos: {
        Row: {
          criado_em: string
          encomenda_id: string
          id: string
          nome_produto: string
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          criado_em?: string
          encomenda_id: string
          id?: string
          nome_produto: string
          produto_id?: string | null
          quantidade?: number
        }
        Update: {
          criado_em?: string
          encomenda_id?: string
          id?: string
          nome_produto?: string
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "encomenda_produtos_encomenda_id_fkey"
            columns: ["encomenda_id"]
            isOneToOne: false
            referencedRelation: "encomendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encomenda_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      encomendas: {
        Row: {
          cliente_nome: string
          cliente_telefone: string | null
          criado_em: string
          data_retirada: string
          empresa_id: string
          foto_url: string | null
          hora_retirada: string | null
          id: string
          observacao: string | null
          status: string
          valor_entrada: number
          valor_restante: number
          valor_total: number
        }
        Insert: {
          cliente_nome: string
          cliente_telefone?: string | null
          criado_em?: string
          data_retirada: string
          empresa_id: string
          foto_url?: string | null
          hora_retirada?: string | null
          id?: string
          observacao?: string | null
          status?: string
          valor_entrada?: number
          valor_restante?: number
          valor_total?: number
        }
        Update: {
          cliente_nome?: string
          cliente_telefone?: string | null
          criado_em?: string
          data_retirada?: string
          empresa_id?: string
          foto_url?: string | null
          hora_retirada?: string | null
          id?: string
          observacao?: string | null
          status?: string
          valor_entrada?: number
          valor_restante?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "encomendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cartao_id: string
          criado_em: string
          id: string
          mes_referencia: string
          paga: boolean
          valor_total: number
        }
        Insert: {
          cartao_id: string
          criado_em?: string
          id?: string
          mes_referencia: string
          paga?: boolean
          valor_total?: number
        }
        Update: {
          cartao_id?: string
          criado_em?: string
          id?: string
          mes_referencia?: string
          paga?: boolean
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_diarios: {
        Row: {
          atualizado_em: string
          cartao: number
          criado_em: string
          data: string
          delivery: number
          dinheiro: number
          empresa_id: string
          id: string
          observacao: string | null
          pix: number
          total: number
        }
        Insert: {
          atualizado_em?: string
          cartao?: number
          criado_em?: string
          data: string
          delivery?: number
          dinheiro?: number
          empresa_id: string
          id?: string
          observacao?: string | null
          pix?: number
          total?: number
        }
        Update: {
          atualizado_em?: string
          cartao?: number
          criado_em?: string
          data?: string
          delivery?: number
          dinheiro?: number
          empresa_id?: string
          id?: string
          observacao?: string | null
          pix?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_diarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          cartao_id: string | null
          categoria: string
          criado_em: string
          data: string
          descricao: string
          empresa_id: string
          forma_pagamento: string
          fornecedor: string | null
          foto_url: string | null
          id: string
          parcelas: number | null
          valor: number
        }
        Insert: {
          cartao_id?: string | null
          categoria: string
          criado_em?: string
          data: string
          descricao: string
          empresa_id: string
          forma_pagamento: string
          fornecedor?: string | null
          foto_url?: string | null
          id?: string
          parcelas?: number | null
          valor: number
        }
        Update: {
          cartao_id?: string | null
          categoria?: string
          criado_em?: string
          data?: string
          descricao?: string
          empresa_id?: string
          forma_pagamento?: string
          fornecedor?: string | null
          foto_url?: string | null
          id?: string
          parcelas?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          criado_em: string
          custo_por_grama: number | null
          custo_por_unidade: number | null
          empresa_id: string
          id: string
          nome: string
          quantidade_comprada: number
          tipo: string
          unidade: string
          valor_pago: number
        }
        Insert: {
          criado_em?: string
          custo_por_grama?: number | null
          custo_por_unidade?: number | null
          empresa_id: string
          id?: string
          nome: string
          quantidade_comprada: number
          tipo: string
          unidade: string
          valor_pago: number
        }
        Update: {
          criado_em?: string
          custo_por_grama?: number | null
          custo_por_unidade?: number | null
          empresa_id?: string
          id?: string
          nome?: string
          quantidade_comprada?: number
          tipo?: string
          unidade?: string
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_fatura: {
        Row: {
          criado_em: string
          descricao: string
          fatura_id: string
          gasto_id: string | null
          id: string
          parcela_atual: number
          total_parcelas: number
          valor: number
        }
        Insert: {
          criado_em?: string
          descricao: string
          fatura_id: string
          gasto_id?: string | null
          id?: string
          parcela_atual?: number
          total_parcelas?: number
          valor: number
        }
        Update: {
          criado_em?: string
          descricao?: string
          fatura_id?: string
          gasto_id?: string | null
          id?: string
          parcela_atual?: number
          total_parcelas?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_fatura_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_fatura_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_faturamento: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          mes_referencia: string
          valor_meta: number
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          mes_referencia: string
          valor_meta: number
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          mes_referencia?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_faturamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      papeis_usuarios: {
        Row: {
          id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Insert: {
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Update: {
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          user_id?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          criado_em: string
          email: string
          empresa_id: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          email: string
          empresa_id: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          criado_em?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_componentes: {
        Row: {
          componente_id: string
          criado_em: string
          id: string
          produto_id: string
          quantidade: number
          tipo_componente: string
        }
        Insert: {
          componente_id: string
          criado_em?: string
          id?: string
          produto_id: string
          quantidade: number
          tipo_componente: string
        }
        Update: {
          componente_id?: string
          criado_em?: string
          id?: string
          produto_id?: string
          quantidade?: number
          tipo_componente?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_componentes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          criado_em: string
          custo_total: number
          empresa_id: string
          id: string
          nome: string
          perc_custo_fixo: number | null
          perc_lucro: number | null
          perc_taxa_cartao: number | null
          perc_taxa_delivery: number | null
          preco_ideal: number | null
          tipo_venda: string
        }
        Insert: {
          criado_em?: string
          custo_total?: number
          empresa_id: string
          id?: string
          nome: string
          perc_custo_fixo?: number | null
          perc_lucro?: number | null
          perc_taxa_cartao?: number | null
          perc_taxa_delivery?: number | null
          preco_ideal?: number | null
          tipo_venda: string
        }
        Update: {
          criado_em?: string
          custo_total?: number
          empresa_id?: string
          id?: string
          nome?: string
          perc_custo_fixo?: number | null
          perc_lucro?: number | null
          perc_taxa_cartao?: number | null
          perc_taxa_delivery?: number | null
          preco_ideal?: number | null
          tipo_venda?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_empresa_id_do_usuario: { Args: never; Returns: string }
      tem_papel: {
        Args: {
          _papel: Database["public"]["Enums"]["papel_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      papel_usuario: "admin" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      papel_usuario: ["admin", "operador"],
    },
  },
} as const
