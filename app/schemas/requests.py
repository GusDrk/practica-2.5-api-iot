from pydantic import BaseModel, Field

class VehiculoCrear(BaseModel):
    nombre: str
    modelo: str | None = None
    descripcion: str | None = None
    microcontrolador: str | None = None

class VehiculoActualizar(VehiculoCrear):
    activo: bool

class ComandoCrear(BaseModel):
    id_vehiculo: int
    nombre: str
    codigo: int
    descripcion: str | None = None

class ComandoActualizar(BaseModel):
    nombre: str
    codigo: int
    descripcion: str | None = None
    activo: bool

class DemoCrear(BaseModel):
    id_vehiculo: int
    nombre: str
    descripcion: str | None = None

class DemoActualizar(BaseModel):
    nombre: str
    descripcion: str | None = None
    activo: bool

class MovimientoCrear(BaseModel):
    id_demo: int
    id_comando: int
    orden: int = Field(ge=1)
    duracion_ms: int = Field(ge=0)
    pausa_ms: int = Field(ge=0)

class MovimientoActualizar(BaseModel):
    id_comando: int
    orden: int = Field(ge=1)
    duracion_ms: int = Field(ge=0)
    pausa_ms: int = Field(ge=0)

class EjecutarComando(BaseModel):
    id_vehiculo: int
    id_comando: int

class EjecutarDemo(BaseModel):
    id_vehiculo: int
    id_demo: int
