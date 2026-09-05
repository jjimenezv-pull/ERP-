export type EstadoInterno = "En curso (asignada)" | "Cerrado" | "En espera";
export type EstadoProveedor = "N/A" | "Pendiente" | "En revisión" | "Resuelto";

export type Database = {
  public: {
    Tables: {
      casos: {
        Row: {
          id: string;
          id_glpi: number;
          titulo: string | null;
          estado_interno: EstadoInterno;
          tipo: string | null;
          ubicacion: string | null;
          solicitante: string | null;
          categoria: string | null;
          fecha_apertura: string | null;
          fecha_cierre: string | null;
          tecnico_asignado: string | null;
          urgencia: string | null;
          descripcion: string | null;
          solucion: string | null;
          caso_escalado_proveedor: string | null;
          estado_proveedor: EstadoProveedor | null;
          semana_carga: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["casos"]["Row"]> & {
          id_glpi: number;
          estado_interno: EstadoInterno;
        };
        Update: Partial<Database["public"]["Tables"]["casos"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export type Caso = Database["public"]["Tables"]["casos"]["Row"];
