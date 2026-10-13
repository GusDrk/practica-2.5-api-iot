from fastapi import HTTPException
from app.database.mysql import Database

class VehicleService:
    def __init__(self, db: Database):
        self.db = db

    def one(self, procedure, *args):
        records = self.db.call(procedure, *args)
        if not records:
            raise HTTPException(404, 'No se encontró el recurso')
        return records[0]

    def validate_move(self, id_vehiculo: int, id_comando: int):
        vehicle = self.one('sp_obtener_vehiculo', id_vehiculo)
        if not vehicle['activo']:
            raise HTTPException(400, 'El vehículo está inactivo')
        commands = self.db.call('sp_obtener_comandos_vehiculo', id_vehiculo)
        command = next((c for c in commands if c['id_comando'] == id_comando), None)
        if not command or not command['activo']:
            raise HTTPException(400, 'El comando no existe para el vehículo o está inactivo')
        return command

    def move(self, id_vehiculo: int, id_comando: int, origen='MANUAL', record=True):
        command = self.validate_move(id_vehiculo, id_comando)
        with self.db.connection() as conn:
            self.db.call('sp_actualizar_estado', id_vehiculo, id_comando, True, conn=conn)
            if record:
                self.db.call('sp_registrar_historial', id_vehiculo, id_comando, origen, conn=conn)
        return {'tipo': 'movimiento', 'id_vehiculo': id_vehiculo,
                'id_comando': id_comando, 'comando': command['nombre'], 'codigo': command['codigo'],
                'origen': origen}
