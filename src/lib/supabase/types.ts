export type EstadoInterno = "En curso (asignada)" | "Cerrado" | "En espera";
export type EstadoProveedor = "N/A" | "Pendiente" | "En revisión" | "Resuelto";
export type UserRole = "admin" | "viewer";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          password_set: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
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
      casos_proveedor: {
        Row: {
          id: string;
          id_tarea: number;
          autor: string | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          asunto: string | null;
          asignatario: string | null;
          tipo_facturacion: string | null;
          prioridad: string | null;
          proyecto: string | null;
          porcentaje_realizado: number | null;
          actualizado_por: string | null;
          estado: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["casos_proveedor"]["Row"]> & {
          id_tarea: number;
        };
        Update: Partial<Database["public"]["Tables"]["casos_proveedor"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cambiar_rol_usuario_seguro: {
        Args: { target_id: string; nuevo_rol: string };
        Returns: void;
      };
      bloquear_usuario_seguro: {
        Args: { target_id: string; bloquear: boolean };
        Returns: void;
      };
    };
  };
};

export type Caso = Database["public"]["Tables"]["casos"]["Row"];
export type CasoProveedor = Database["public"]["Tables"]["casos_proveedor"]["Row"];
