import React from 'react';
import { Container, Navbar, Nav, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ThemeToggle from './components/ThemeToggle'; // Import ThemeToggle

const App = () => {
  return (
    <div>
      <header className="app-header">
        <h1>Face Recognition App</h1>
        <ThemeToggle /> {/* Add ThemeToggle here */}
      </header>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand href="#home">Face Recognition App</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ml-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#register">Register</Nav.Link>
            <Nav.Link href="#recognition">Recognition</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Container fluid>
        <Row>
          <Col md={3} className="bg-light sidebar">
            <h5>Menu</h5>
            <Nav className="flex-column">
              <Nav.Link href="#home">Dashboard</Nav.Link>
              <Nav.Link href="#register">Register Face</Nav.Link>
              <Nav.Link href="#recognition">Live Recognition</Nav.Link>
            </Nav>
          </Col>
          <Col md={9} className="main-content">
            <h1>Welcome to the Face Recognition App</h1>
            <p>Select an option from the menu to get started.</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default App;
