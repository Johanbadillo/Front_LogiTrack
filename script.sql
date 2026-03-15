DROP DATABASE IF EXISTS logitrack;
CREATE DATABASE logitrack;
USE logitrack;

CREATE TABLE persona(
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    documento VARCHAR(20) NOT NULL,
    correo VARCHAR(50) NOT NULL,
    telefono VARCHAR(20) NOT NULL
);

CREATE TABLE empleado(
    id INT PRIMARY KEY NOT NULL,
    rol ENUM("ADMIN","EMPLEADO") NOT NULL,
    usuario VARCHAR(50) NOT NULL,
    contrasena VARCHAR(50) NOT NULL,
    FOREIGN KEY (id) REFERENCES persona(id)
);

CREATE TABLE producto(
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    tamano ENUM("PEQUENO","MEDIANO","GRANDE") NOT NULL,
    precio_mensual DOUBLE NOT NULL
);

CREATE TABLE bodega (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    ubicacion VARCHAR(50) NOT NULL,
    capacidad INT NOT NULL,
    id_encargado INT NOT NULL,
    FOREIGN KEY (id_encargado) REFERENCES empleado(id)
);

CREATE TABLE inventario(
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    id_bodega INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_bodega) REFERENCES bodega(id),
    FOREIGN KEY (id_producto) REFERENCES producto(id)
);

CREATE TABLE movimiento(
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    fecha DATE NOT NULL,
    tipo_movimiento ENUM("ENTRADA","SALIDA","TRANSFERENCIA") NOT NULL,
    id_empleado INT NOT NULL,
    id_bodega_origen INT NOT NULL,
    id_bodega_destino INT NOT NULL,
    FOREIGN KEY (id_empleado) REFERENCES empleado(id),
    FOREIGN KEY (id_bodega_origen) REFERENCES bodega(id),
    FOREIGN KEY (id_bodega_destino) REFERENCES bodega(id)
);

CREATE TABLE detalle_movimiento(
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    id_movimiento INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_movimiento) REFERENCES movimiento(id),
    FOREIGN KEY (id_producto) REFERENCES producto(id)
);

CREATE TABLE auditoria(
    id INT PRIMARY KEY AUTO_INCREMENT,
    entidad VARCHAR(50),
    operacion ENUM("INSERT","UPDATE","DELETE"),
    fecha DATETIME,
    usuario INT,
    valor_anterior VARCHAR(250),
    valor_nuevo VARCHAR(250)
);

INSERT INTO persona (nombre, documento, correo, telefono) VALUES
('Carlos Ramirez','1000000001','carlos@logitrack.com','3001111111'),
('Laura Gomez','1000000002','laura@logitrack.com','3002222222');

INSERT INTO empleado (id, rol, usuario, contrasena) VALUES
(1,'ADMIN','juan_admin','Admin1234'),
(2,'EMPLEADO','laura.emp','Admin1234');

INSERT INTO producto (nombre, categoria, tamano, precio_mensual) VALUES
('Caja de almacenamiento','Logistica','MEDIANO',120000),
('Contenedor plastico','Logistica','GRANDE',200000),
('Caja pequeña','Logistica','PEQUENO',80000);

INSERT INTO bodega (nombre, ubicacion, capacidad, id_encargado) VALUES
('Bodega Central','Bogota',500,1),
('Bodega Norte','Medellin',300,2);

INSERT INTO inventario (id_bodega, id_producto, cantidad) VALUES
(1,1,40),
(1,2,25),
(2,1,10),
(2,3,30);

INSERT INTO movimiento (fecha, tipo_movimiento, id_empleado, id_bodega_origen, id_bodega_destino) VALUES
('2026-03-11','TRANSFERENCIA',1,1,2);

INSERT INTO detalle_movimiento (id_movimiento, id_producto, cantidad) VALUES
(1,1,5);

INSERT INTO auditoria (entidad, operacion, fecha, usuario, valor_anterior, valor_nuevo) VALUES
('producto','INSERT',NOW(),1,NULL,'Producto creado');
