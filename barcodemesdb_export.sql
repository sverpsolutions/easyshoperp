-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: barcodemes
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_log` (
  `Audit_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Employee_ID` int(11) DEFAULT NULL,
  `Action` varchar(200) NOT NULL,
  `IP_Address` varchar(50) DEFAULT NULL,
  `Log_Time` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Audit_ID`),
  KEY `Employee_ID` (`Employee_ID`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`Employee_ID`) REFERENCES `employees` (`Employee_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,2,'Login','::1','2026-04-03 14:32:42'),(2,2,'Login','::1','2026-04-03 14:33:33'),(3,2,'Login','::1','2026-04-03 14:34:37'),(4,2,'Login','::1','2026-04-03 14:35:07'),(5,2,'Login','::1','2026-04-03 14:35:25'),(6,2,'Login','::1','2026-04-03 14:35:52'),(7,2,'Login','::1','2026-04-03 14:36:27'),(8,2,'Login','::1','2026-04-03 14:54:01'),(9,2,'Created job J-2026-0001','::1','2026-04-03 15:12:43'),(10,2,'Created employee Ramkesh','::1','2026-04-03 15:13:40'),(11,2,'Updated job 1','::1','2026-04-03 15:13:49'),(12,2,'Logout','::1','2026-04-03 15:18:20'),(13,1,'Login','::1','2026-04-03 15:20:29'),(14,1,'Updated employee 3','::1','2026-04-03 15:20:55'),(15,1,'Logout','::1','2026-04-03 15:20:58'),(16,3,'Login','::1','2026-04-03 15:21:06'),(17,3,'Logout','::1','2026-04-03 15:21:22'),(18,1,'Login','::1','2026-04-03 15:21:28'),(19,1,'Updated job 1','::1','2026-04-03 15:21:38'),(20,1,'Logout','::1','2026-04-03 15:21:41'),(21,3,'Login','::1','2026-04-03 15:21:58'),(22,3,'Started job 1 on machine 1','::1','2026-04-03 15:22:01'),(23,3,'Logout','::1','2026-04-03 15:22:03'),(24,1,'Login','::1','2026-04-03 15:22:13'),(25,1,'Login','::1','2026-04-03 23:04:55'),(26,1,'Logout','::1','2026-04-03 23:08:42'),(27,3,'Login','::1','2026-04-03 23:08:57'),(28,3,'Logout','::1','2026-04-03 23:10:07'),(29,1,'Login','::1','2026-04-03 23:10:13'),(30,1,'Logout','::1','2026-04-03 23:17:33'),(31,3,'Login','::1','2026-04-03 23:17:43'),(32,3,'Logout','::1','2026-04-03 23:18:00'),(33,1,'Login','::1','2026-04-03 23:18:07'),(34,1,'Logout','::1','2026-04-03 23:32:13'),(35,1,'Login','::1','2026-04-03 23:32:22');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_items`
--

DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bill_items` (
  `Item_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Bill_ID` int(11) NOT NULL,
  `Description` varchar(200) NOT NULL,
  `Size` varchar(50) DEFAULT NULL,
  `Label_Type` varchar(20) DEFAULT NULL,
  `Qty` int(11) DEFAULT 1,
  `Rate` decimal(10,2) NOT NULL,
  `Amount` decimal(12,2) NOT NULL,
  `Tax_Pct` decimal(5,2) DEFAULT 0.00,
  `Tax_Amount` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`Item_ID`),
  KEY `Bill_ID` (`Bill_ID`),
  CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`Bill_ID`) REFERENCES `bill_register` (`Bill_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_items`
--

LOCK TABLES `bill_items` WRITE;
/*!40000 ALTER TABLE `bill_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `bill_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_register`
--

DROP TABLE IF EXISTS `bill_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bill_register` (
  `Bill_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Bill_Number` varchar(50) NOT NULL,
  `Bill_Date` date NOT NULL DEFAULT curdate(),
  `Customer_ID` int(11) DEFAULT NULL,
  `Customer_Name` varchar(100) NOT NULL,
  `Mobile` varchar(20) DEFAULT NULL,
  `Gross_Amount` decimal(12,2) DEFAULT 0.00,
  `Discount_Amt` decimal(12,2) DEFAULT 0.00,
  `Tax_Amount` decimal(12,2) DEFAULT 0.00,
  `Net_Amount` decimal(12,2) NOT NULL,
  `Amount_Paid` decimal(12,2) DEFAULT 0.00,
  `Balance_Due` decimal(12,2) DEFAULT 0.00,
  `Payment_Status` varchar(20) DEFAULT 'Unpaid',
  `Job_ID` int(11) DEFAULT NULL,
  `External_Ref` varchar(100) DEFAULT NULL,
  `Items_JSON` longtext DEFAULT NULL,
  `Notes` varchar(500) DEFAULT NULL,
  `Created_By` int(11) DEFAULT NULL,
  `Created_Date` datetime DEFAULT current_timestamp(),
  `Updated_Date` datetime DEFAULT NULL,
  PRIMARY KEY (`Bill_ID`),
  UNIQUE KEY `Bill_Number` (`Bill_Number`),
  KEY `Customer_ID` (`Customer_ID`),
  KEY `Job_ID` (`Job_ID`),
  KEY `Created_By` (`Created_By`),
  CONSTRAINT `bill_register_ibfk_1` FOREIGN KEY (`Customer_ID`) REFERENCES `customer_master` (`Customer_ID`),
  CONSTRAINT `bill_register_ibfk_2` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`),
  CONSTRAINT `bill_register_ibfk_3` FOREIGN KEY (`Created_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `chk_bill_pay_status` CHECK (`Payment_Status` in ('Unpaid','Partial','Paid','Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_register`
--

LOCK TABLES `bill_register` WRITE;
/*!40000 ALTER TABLE `bill_register` DISABLE KEYS */;
/*!40000 ALTER TABLE `bill_register` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `brands` (
  `Brand_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Brand_Name` varchar(100) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Brand_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Generic',1),(2,'Zebra',1),(3,'Citizen',1),(4,'TSC',1),(5,'Postek',1);
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversion_register`
--

DROP TABLE IF EXISTS `conversion_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversion_register` (
  `Conversion_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Conversion_Number` varchar(30) NOT NULL,
  `Conversion_Date` date NOT NULL,
  `Input_Item_ID` int(11) DEFAULT NULL,
  `Input_Item_Name` varchar(200) DEFAULT NULL,
  `Input_Qty` decimal(10,3) DEFAULT 0.000,
  `Input_Unit` varchar(20) DEFAULT 'Roll',
  `Output_Item_ID` int(11) DEFAULT NULL,
  `Output_Item_Name` varchar(200) DEFAULT NULL,
  `Output_Qty` decimal(10,3) DEFAULT 0.000,
  `Output_Unit` varchar(20) DEFAULT 'Roll',
  `Wastage_Qty` decimal(10,3) DEFAULT 0.000,
  `Wastage_Pct` decimal(5,2) DEFAULT 0.00,
  `Machine_ID` int(11) DEFAULT NULL,
  `Operator_ID` int(11) DEFAULT NULL,
  `Job_ID` int(11) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `Status` enum('Draft','Completed','Cancelled') DEFAULT 'Draft',
  `Created_By` int(11) DEFAULT NULL,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Conversion_ID`),
  UNIQUE KEY `Conversion_Number` (`Conversion_Number`),
  KEY `Input_Item_ID` (`Input_Item_ID`),
  KEY `Output_Item_ID` (`Output_Item_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  KEY `Operator_ID` (`Operator_ID`),
  KEY `Created_By` (`Created_By`),
  CONSTRAINT `conversion_register_ibfk_1` FOREIGN KEY (`Input_Item_ID`) REFERENCES `item_master` (`Item_ID`) ON DELETE SET NULL,
  CONSTRAINT `conversion_register_ibfk_2` FOREIGN KEY (`Output_Item_ID`) REFERENCES `item_master` (`Item_ID`) ON DELETE SET NULL,
  CONSTRAINT `conversion_register_ibfk_3` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`) ON DELETE SET NULL,
  CONSTRAINT `conversion_register_ibfk_4` FOREIGN KEY (`Operator_ID`) REFERENCES `employees` (`Employee_ID`) ON DELETE SET NULL,
  CONSTRAINT `conversion_register_ibfk_5` FOREIGN KEY (`Created_By`) REFERENCES `employees` (`Employee_ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversion_register`
--

LOCK TABLES `conversion_register` WRITE;
/*!40000 ALTER TABLE `conversion_register` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversion_register` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_master`
--

DROP TABLE IF EXISTS `customer_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_master` (
  `Customer_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_Name` varchar(100) NOT NULL,
  `Mobile` varchar(20) NOT NULL,
  `Alt_Mobile` varchar(20) DEFAULT NULL,
  `Address` varchar(300) DEFAULT NULL,
  `City` varchar(50) DEFAULT NULL,
  `State` varchar(100) DEFAULT NULL,
  `State_Code` varchar(5) DEFAULT NULL,
  `GST_No` varchar(20) DEFAULT NULL,
  `PAN_No` varchar(20) DEFAULT NULL,
  `Category` varchar(20) DEFAULT 'Regular',
  `Credit_Limit` decimal(12,2) DEFAULT 0.00,
  `Opening_Balance` decimal(12,2) DEFAULT 0.00,
  `Current_Balance` decimal(12,2) DEFAULT 0.00,
  `Notes` varchar(500) DEFAULT NULL,
  `Photo_Path` varchar(500) DEFAULT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  `Created_Date` datetime DEFAULT current_timestamp(),
  `Portal_Username` varchar(50) DEFAULT NULL,
  `Portal_Password` varchar(200) DEFAULT NULL,
  `Portal_Active` tinyint(1) DEFAULT 0,
  `Email` varchar(100) DEFAULT NULL,
  `Logo_Path` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`Customer_ID`),
  CONSTRAINT `chk_cust_cat` CHECK (`Category` in ('Regular','Wholesale','Retail','Corporate'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_master`
--

LOCK TABLES `customer_master` WRITE;
/*!40000 ALTER TABLE `customer_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_payments` (
  `Payment_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) DEFAULT NULL,
  `Customer_Name` varchar(100) NOT NULL,
  `Job_ID` int(11) DEFAULT NULL,
  `Bill_ID` int(11) DEFAULT NULL,
  `Payment_Date` date DEFAULT curdate(),
  `Payment_Type` varchar(20) NOT NULL,
  `Amount` decimal(12,2) NOT NULL,
  `Payment_Mode` varchar(20) DEFAULT 'Cash',
  `Cheque_No` varchar(30) DEFAULT NULL,
  `Reference_No` varchar(50) DEFAULT NULL,
  `Narration` varchar(300) DEFAULT NULL,
  `Balance_After` decimal(12,2) DEFAULT NULL,
  `Entered_By` int(11) DEFAULT NULL,
  `Created_Date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Payment_ID`),
  KEY `Customer_ID` (`Customer_ID`),
  KEY `Job_ID` (`Job_ID`),
  KEY `Entered_By` (`Entered_By`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`Customer_ID`) REFERENCES `customer_master` (`Customer_ID`),
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`),
  CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`Entered_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `chk_pay_type` CHECK (`Payment_Type` in ('Receipt','Payment','Adjustment','Opening')),
  CONSTRAINT `chk_pay_mode` CHECK (`Payment_Mode` in ('Cash','Cheque','UPI','NEFT','RTGS','Online'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_advances`
--

DROP TABLE IF EXISTS `employee_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employee_advances` (
  `Advance_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Employee_ID` int(11) NOT NULL,
  `Request_Date` datetime DEFAULT current_timestamp(),
  `Amount_Requested` decimal(10,2) NOT NULL,
  `Reason` varchar(300) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Pending',
  `Approved_By` int(11) DEFAULT NULL,
  `Approved_Date` datetime DEFAULT NULL,
  `Amount_Approved` decimal(10,2) DEFAULT NULL,
  `Reject_Reason` varchar(200) DEFAULT NULL,
  `Paid_By` int(11) DEFAULT NULL,
  `Paid_Date` datetime DEFAULT NULL,
  `Amount_Paid` decimal(10,2) DEFAULT NULL,
  `Payment_Mode` varchar(20) DEFAULT 'Cash',
  `Is_Deducted` tinyint(1) DEFAULT 0,
  `Deduct_Month` varchar(7) DEFAULT NULL,
  `Notes` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`Advance_ID`),
  KEY `Employee_ID` (`Employee_ID`),
  KEY `Approved_By` (`Approved_By`),
  KEY `Paid_By` (`Paid_By`),
  CONSTRAINT `employee_advances_ibfk_1` FOREIGN KEY (`Employee_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `employee_advances_ibfk_2` FOREIGN KEY (`Approved_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `employee_advances_ibfk_3` FOREIGN KEY (`Paid_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `chk_adv_status` CHECK (`Status` in ('Pending','Approved','Rejected','Paid')),
  CONSTRAINT `chk_adv_mode` CHECK (`Payment_Mode` in ('Cash','Bank Transfer','UPI'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_advances`
--

LOCK TABLES `employee_advances` WRITE;
/*!40000 ALTER TABLE `employee_advances` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_advances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_attendance`
--

DROP TABLE IF EXISTS `employee_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employee_attendance` (
  `Att_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Employee_ID` int(11) NOT NULL,
  `Att_Date` date NOT NULL DEFAULT curdate(),
  `Shift_ID` int(11) DEFAULT NULL,
  `In_Time` datetime DEFAULT NULL,
  `Out_Time` datetime DEFAULT NULL,
  `Total_Hours` decimal(5,2) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Absent',
  `Marked_By` int(11) DEFAULT NULL,
  `Remarks` varchar(200) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Att_ID`),
  UNIQUE KEY `uq_emp_date` (`Employee_ID`,`Att_Date`),
  KEY `Marked_By` (`Marked_By`),
  CONSTRAINT `employee_attendance_ibfk_1` FOREIGN KEY (`Employee_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `employee_attendance_ibfk_2` FOREIGN KEY (`Marked_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `chk_att_status` CHECK (`Status` in ('Present','Absent','Half Day','Off','Holiday','Late'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_attendance`
--

LOCK TABLES `employee_attendance` WRITE;
/*!40000 ALTER TABLE `employee_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `Employee_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Role` varchar(20) NOT NULL,
  `Mobile` varchar(20) DEFAULT NULL,
  `Username` varchar(50) NOT NULL,
  `Password_Hash` varchar(256) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  `Created_Date` datetime DEFAULT current_timestamp(),
  `Last_Login` datetime DEFAULT NULL,
  `Father_Name` varchar(100) DEFAULT NULL,
  `Address` varchar(300) DEFAULT NULL,
  `Aadhar_No` varchar(20) DEFAULT NULL,
  `Join_Date` date DEFAULT NULL,
  `Monthly_Salary` decimal(10,2) DEFAULT 0.00,
  `Bank_Name` varchar(100) DEFAULT NULL,
  `Bank_Account` varchar(30) DEFAULT NULL,
  `Bank_IFSC` varchar(20) DEFAULT NULL,
  `Advance_Limit_Monthly` decimal(10,2) DEFAULT 5000.00,
  `Total_Advance_Balance` decimal(10,2) DEFAULT 0.00,
  `Emergency_Contact` varchar(20) DEFAULT NULL,
  `Photo_Path` varchar(300) DEFAULT NULL,
  `Resume_Path` varchar(300) DEFAULT NULL,
  `Aadhar_Path` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`Employee_ID`),
  UNIQUE KEY `Username` (`Username`),
  CONSTRAINT `chk_emp_role` CHECK (`Role` in ('Owner','Admin','Operator'))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'Factory Owner','Owner','9999999999','owner','$2y$10$7wnMS6CpgRqKhrbYYuTO7e7xRLoAIAQSwRMEtN2H6vDjGrjYDfvne',1,'2026-04-03 14:27:19','2026-04-03 20:02:22',NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,5000.00,0.00,NULL,NULL,NULL,NULL),(2,'Admin User','Admin','8888888888','admin','$2y$10$xhKv.0NPCl/I6yJ13npKjOiwyjyElKWQw9qknhywK2LpHc3z5yV9q',1,'2026-04-03 14:27:19','2026-04-03 11:24:01',NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,5000.00,0.00,NULL,NULL,NULL,NULL),(3,'Ramkesh','Operator','111111111','Ramkesh','$2y$10$1WpnaQ.Ou5iHIIHw.Abbge215XD7KozinVnRC4HmdVL95HAmMQTqy',1,'2026-04-03 15:13:40','2026-04-03 19:47:43','b','qq','999098989882','2026-12-01',25000.00,'','','',5000.00,0.00,'',NULL,NULL,NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hourly_impressions`
--

DROP TABLE IF EXISTS `hourly_impressions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hourly_impressions` (
  `Log_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Machine_ID` int(11) NOT NULL,
  `Operator_ID` int(11) NOT NULL,
  `Job_ID` int(11) DEFAULT NULL,
  `Log_Date` date NOT NULL DEFAULT curdate(),
  `Log_Hour` int(11) NOT NULL,
  `Impressions_Count` int(11) NOT NULL DEFAULT 0,
  `Remarks` varchar(200) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Log_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  KEY `Operator_ID` (`Operator_ID`),
  KEY `Job_ID` (`Job_ID`),
  CONSTRAINT `hourly_impressions_ibfk_1` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`),
  CONSTRAINT `hourly_impressions_ibfk_2` FOREIGN KEY (`Operator_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `hourly_impressions_ibfk_3` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hourly_impressions`
--

LOCK TABLES `hourly_impressions` WRITE;
/*!40000 ALTER TABLE `hourly_impressions` DISABLE KEYS */;
/*!40000 ALTER TABLE `hourly_impressions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_categories`
--

DROP TABLE IF EXISTS `item_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_categories` (
  `Category_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Subgroup_ID` int(11) DEFAULT NULL,
  `Category_Name` varchar(100) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Category_ID`),
  KEY `Subgroup_ID` (`Subgroup_ID`),
  CONSTRAINT `item_categories_ibfk_1` FOREIGN KEY (`Subgroup_ID`) REFERENCES `item_subgroups` (`Subgroup_ID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_categories`
--

LOCK TABLES `item_categories` WRITE;
/*!40000 ALTER TABLE `item_categories` DISABLE KEYS */;
INSERT INTO `item_categories` VALUES (1,1,'Thermal Labels',1),(2,1,'Printed Labels',1),(3,2,'Plain Price Labels',1),(4,3,'Courier Labels',1);
/*!40000 ALTER TABLE `item_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_groups`
--

DROP TABLE IF EXISTS `item_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_groups` (
  `Group_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Group_Name` varchar(100) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Group_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_groups`
--

LOCK TABLES `item_groups` WRITE;
/*!40000 ALTER TABLE `item_groups` DISABLE KEYS */;
INSERT INTO `item_groups` VALUES (1,'Labels',1,'2026-04-03 17:43:16'),(2,'Ribbons',1,'2026-04-03 17:43:16'),(3,'Packaging',1,'2026-04-03 17:43:16'),(4,'Stationery',1,'2026-04-03 17:43:16');
/*!40000 ALTER TABLE `item_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_master`
--

DROP TABLE IF EXISTS `item_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_master` (
  `Item_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Item_Code` varchar(50) DEFAULT NULL,
  `Item_Name` varchar(200) NOT NULL,
  `Group_ID` int(11) DEFAULT NULL,
  `Subgroup_ID` int(11) DEFAULT NULL,
  `Category_ID` int(11) DEFAULT NULL,
  `Subcategory_ID` int(11) DEFAULT NULL,
  `Brand_ID` int(11) DEFAULT NULL,
  `Manufacturer` varchar(200) DEFAULT NULL,
  `Paper_Type` varchar(100) DEFAULT NULL COMMENT 'Thermal / Art Paper / BOPP / PET / PP',
  `Core_Type` varchar(50) DEFAULT NULL COMMENT '1 inch / 3 inch',
  `Item_Type` varchar(50) DEFAULT NULL COMMENT 'Plain / Printed',
  `Size_Width` decimal(8,2) DEFAULT NULL COMMENT 'mm',
  `Size_Length` decimal(8,2) DEFAULT NULL COMMENT 'mm',
  `Labels_Per_Roll` int(11) DEFAULT 0,
  `HSN_Code` varchar(20) DEFAULT NULL,
  `GST_Rate` decimal(5,2) DEFAULT 18.00,
  `Unit` varchar(20) DEFAULT 'Roll',
  `Purchase_Rate` decimal(10,2) DEFAULT 0.00,
  `Sale_Rate` decimal(10,2) DEFAULT 0.00,
  `Min_Stock` int(11) DEFAULT 0,
  `Current_Stock` int(11) DEFAULT 0,
  `Barcode_Value` varchar(200) DEFAULT NULL,
  `Photo_Path` varchar(500) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Item_ID`),
  UNIQUE KEY `Item_Code` (`Item_Code`),
  KEY `Group_ID` (`Group_ID`),
  KEY `Subgroup_ID` (`Subgroup_ID`),
  KEY `Category_ID` (`Category_ID`),
  KEY `Subcategory_ID` (`Subcategory_ID`),
  KEY `Brand_ID` (`Brand_ID`),
  CONSTRAINT `item_master_ibfk_1` FOREIGN KEY (`Group_ID`) REFERENCES `item_groups` (`Group_ID`) ON DELETE SET NULL,
  CONSTRAINT `item_master_ibfk_2` FOREIGN KEY (`Subgroup_ID`) REFERENCES `item_subgroups` (`Subgroup_ID`) ON DELETE SET NULL,
  CONSTRAINT `item_master_ibfk_3` FOREIGN KEY (`Category_ID`) REFERENCES `item_categories` (`Category_ID`) ON DELETE SET NULL,
  CONSTRAINT `item_master_ibfk_4` FOREIGN KEY (`Subcategory_ID`) REFERENCES `item_subcategories` (`Subcategory_ID`) ON DELETE SET NULL,
  CONSTRAINT `item_master_ibfk_5` FOREIGN KEY (`Brand_ID`) REFERENCES `brands` (`Brand_ID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_master`
--

LOCK TABLES `item_master` WRITE;
/*!40000 ALTER TABLE `item_master` DISABLE KEYS */;
INSERT INTO `item_master` VALUES (1,'ITM-001','Thermal Label 100x150mm Blank',1,1,1,NULL,NULL,NULL,'Thermal','3 inch','Plain',100.00,150.00,500,'48219090',18.00,'Roll',100.00,150.00,0,0,NULL,NULL,NULL,1,'2026-04-03 17:43:16'),(2,'ITM-002','Thermal Label 75x100mm Blank',1,1,1,NULL,NULL,NULL,'Thermal','1 inch','Plain',75.00,100.00,1000,'48219090',18.00,'Roll',80.00,120.00,0,0,NULL,NULL,NULL,1,'2026-04-03 17:43:16'),(3,'ITM-003','BOPP Printed Label 50x25mm',1,1,2,NULL,NULL,NULL,'BOPP','3 inch','Printed',50.00,25.00,3000,'48219090',18.00,'Roll',180.00,250.00,0,0,NULL,NULL,NULL,1,'2026-04-03 17:43:16'),(4,'ITM-004','Wax Ribbon 110x300m',2,4,NULL,NULL,NULL,NULL,'Wax Ribbon',NULL,NULL,110.00,300.00,NULL,'37023910',18.00,'Roll',140.00,200.00,0,0,NULL,NULL,NULL,1,'2026-04-03 17:43:16');
/*!40000 ALTER TABLE `item_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_subcategories`
--

DROP TABLE IF EXISTS `item_subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_subcategories` (
  `Subcategory_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Category_ID` int(11) DEFAULT NULL,
  `Subcategory_Name` varchar(100) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Subcategory_ID`),
  KEY `Category_ID` (`Category_ID`),
  CONSTRAINT `item_subcategories_ibfk_1` FOREIGN KEY (`Category_ID`) REFERENCES `item_categories` (`Category_ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_subcategories`
--

LOCK TABLES `item_subcategories` WRITE;
/*!40000 ALTER TABLE `item_subcategories` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_subgroups`
--

DROP TABLE IF EXISTS `item_subgroups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_subgroups` (
  `Subgroup_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Group_ID` int(11) NOT NULL,
  `Subgroup_Name` varchar(100) NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Subgroup_ID`),
  KEY `Group_ID` (`Group_ID`),
  CONSTRAINT `item_subgroups_ibfk_1` FOREIGN KEY (`Group_ID`) REFERENCES `item_groups` (`Group_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_subgroups`
--

LOCK TABLES `item_subgroups` WRITE;
/*!40000 ALTER TABLE `item_subgroups` DISABLE KEYS */;
INSERT INTO `item_subgroups` VALUES (1,1,'Barcode Labels',1),(2,1,'Price Labels',1),(3,1,'Shipping Labels',1),(4,2,'Wax Ribbons',1),(5,2,'Wax-Resin Ribbons',1),(6,2,'Resin Ribbons',1);
/*!40000 ALTER TABLE `item_subgroups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_production_log`
--

DROP TABLE IF EXISTS `job_production_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_production_log` (
  `Log_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Job_ID` int(11) NOT NULL,
  `Operator_ID` int(11) NOT NULL,
  `Machine_ID` int(11) NOT NULL,
  `Qty_Produced` int(11) NOT NULL,
  `Entry_Time` datetime DEFAULT current_timestamp(),
  `Remarks` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`Log_ID`),
  KEY `Job_ID` (`Job_ID`),
  KEY `Operator_ID` (`Operator_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  CONSTRAINT `job_production_log_ibfk_1` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`),
  CONSTRAINT `job_production_log_ibfk_2` FOREIGN KEY (`Operator_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `job_production_log_ibfk_3` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_production_log`
--

LOCK TABLES `job_production_log` WRITE;
/*!40000 ALTER TABLE `job_production_log` DISABLE KEYS */;
INSERT INTO `job_production_log` VALUES (1,1,3,1,20000,'2026-04-03 23:10:03','50% '),(2,1,3,1,20000,'2026-04-03 23:17:57','full done ');
/*!40000 ALTER TABLE `job_production_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_queue`
--

DROP TABLE IF EXISTS `job_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_queue` (
  `Queue_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Machine_ID` int(11) NOT NULL,
  `Job_ID` int(11) NOT NULL,
  `Sequence_Number` int(11) NOT NULL,
  `Status` varchar(20) DEFAULT 'Waiting',
  `Queued_Date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Queue_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  KEY `Job_ID` (`Job_ID`),
  CONSTRAINT `job_queue_ibfk_1` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`),
  CONSTRAINT `job_queue_ibfk_2` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_queue`
--

LOCK TABLES `job_queue` WRITE;
/*!40000 ALTER TABLE `job_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_requests`
--

DROP TABLE IF EXISTS `job_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_requests` (
  `Request_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Employee_ID` int(11) NOT NULL,
  `Machine_ID` int(11) DEFAULT NULL,
  `Request_Type` varchar(20) DEFAULT 'Job',
  `Description` varchar(500) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Pending',
  `Request_Date` datetime DEFAULT current_timestamp(),
  `Acknowledged_By` int(11) DEFAULT NULL,
  `Acknowledged_At` datetime DEFAULT NULL,
  `Notes` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`Request_ID`),
  KEY `Employee_ID` (`Employee_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  KEY `Acknowledged_By` (`Acknowledged_By`),
  CONSTRAINT `job_requests_ibfk_1` FOREIGN KEY (`Employee_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `job_requests_ibfk_2` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`),
  CONSTRAINT `job_requests_ibfk_3` FOREIGN KEY (`Acknowledged_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `chk_jreq_status` CHECK (`Status` in ('Pending','Acknowledged','Closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_requests`
--

LOCK TABLES `job_requests` WRITE;
/*!40000 ALTER TABLE `job_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `Job_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Job_Number` varchar(30) NOT NULL,
  `Order_Date` date NOT NULL DEFAULT curdate(),
  `Customer_Name` varchar(100) NOT NULL,
  `Customer_ID` int(11) DEFAULT NULL,
  `Mobile_No` varchar(20) DEFAULT NULL,
  `Delivery_Date` date DEFAULT NULL,
  `Size` varchar(50) DEFAULT NULL,
  `Label` varchar(100) DEFAULT NULL,
  `UPS` int(11) DEFAULT 1,
  `Gap_Type` varchar(20) DEFAULT 'With Gap',
  `Paper` varchar(50) DEFAULT NULL,
  `Core` varchar(30) DEFAULT NULL,
  `Packing` varchar(50) DEFAULT NULL,
  `Label_Type` varchar(20) NOT NULL DEFAULT 'Plain',
  `Required_Qty` int(11) NOT NULL,
  `Produced_Qty` int(11) DEFAULT 0,
  `Status` varchar(20) DEFAULT 'Pending',
  `Priority` int(11) DEFAULT 5,
  `Notes` varchar(500) DEFAULT NULL,
  `Created_Date` datetime DEFAULT current_timestamp(),
  `Telegram_Notify` tinyint(1) DEFAULT 0,
  `Customer_Chat_ID` varchar(50) DEFAULT NULL,
  `Assigned_Machine_ID` int(11) DEFAULT NULL,
  `Assigned_Operator_ID` int(11) DEFAULT NULL,
  `Start_Time` datetime DEFAULT NULL,
  `End_Time` datetime DEFAULT NULL,
  `Bill_ID` int(11) DEFAULT NULL,
  `Bill_Status` varchar(20) DEFAULT 'Not Billed',
  PRIMARY KEY (`Job_ID`),
  UNIQUE KEY `Job_Number` (`Job_Number`),
  KEY `FK_Job_Customer` (`Customer_ID`),
  KEY `FK_Job_Machine` (`Assigned_Machine_ID`),
  KEY `FK_Job_Operator` (`Assigned_Operator_ID`),
  CONSTRAINT `FK_Job_Customer` FOREIGN KEY (`Customer_ID`) REFERENCES `customer_master` (`Customer_ID`) ON DELETE SET NULL,
  CONSTRAINT `FK_Job_Machine` FOREIGN KEY (`Assigned_Machine_ID`) REFERENCES `machines` (`Machine_ID`) ON DELETE SET NULL,
  CONSTRAINT `FK_Job_Operator` FOREIGN KEY (`Assigned_Operator_ID`) REFERENCES `employees` (`Employee_ID`) ON DELETE SET NULL,
  CONSTRAINT `chk_job_bill_status` CHECK (`Bill_Status` in ('Not Billed','Billed','Paid','Partial'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (1,'J-2026-0001','2026-04-03','Vivek Yadav',NULL,'9871118688','2026-04-10','38x25','38x25 in dt',2,'With Gap','DT','','','Printed',40000,40000,'Completed',5,'','2026-04-03 15:12:43',0,NULL,1,3,'2026-04-03 15:22:01','2026-04-03 19:47:58',NULL,'Not Billed');
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_log`
--

DROP TABLE IF EXISTS `machine_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `machine_log` (
  `Log_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Machine_ID` int(11) NOT NULL,
  `Operator_ID` int(11) DEFAULT NULL,
  `Job_ID` int(11) DEFAULT NULL,
  `Status` varchar(15) NOT NULL,
  `Start_Time` datetime DEFAULT current_timestamp(),
  `End_Time` datetime DEFAULT NULL,
  `Total_Run_Minutes` int(11) DEFAULT NULL,
  PRIMARY KEY (`Log_ID`),
  KEY `Machine_ID` (`Machine_ID`),
  KEY `Operator_ID` (`Operator_ID`),
  KEY `Job_ID` (`Job_ID`),
  CONSTRAINT `machine_log_ibfk_1` FOREIGN KEY (`Machine_ID`) REFERENCES `machines` (`Machine_ID`),
  CONSTRAINT `machine_log_ibfk_2` FOREIGN KEY (`Operator_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `machine_log_ibfk_3` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_log`
--

LOCK TABLES `machine_log` WRITE;
/*!40000 ALTER TABLE `machine_log` DISABLE KEYS */;
INSERT INTO `machine_log` VALUES (1,1,3,1,'Running','2026-04-03 15:22:01',NULL,NULL);
/*!40000 ALTER TABLE `machine_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `machines` (
  `Machine_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Machine_Name` varchar(50) NOT NULL,
  `Machine_Type` varchar(10) NOT NULL,
  `Status` varchar(15) DEFAULT 'Idle',
  `Current_Operator_ID` int(11) DEFAULT NULL,
  `Current_Job_ID` int(11) DEFAULT NULL,
  `Last_ON_Time` datetime DEFAULT NULL,
  `Last_OFF_Time` datetime DEFAULT NULL,
  `Location` varchar(50) DEFAULT NULL,
  `Notes` varchar(200) DEFAULT NULL,
  `Target_Impressions_Per_Hour` int(11) DEFAULT 0,
  `Machine_Category` varchar(30) DEFAULT 'Flat Belt',
  `Photo_Path` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`Machine_ID`),
  KEY `FK_Mach_Operator` (`Current_Operator_ID`),
  KEY `FK_Mach_Job` (`Current_Job_ID`),
  CONSTRAINT `FK_Mach_Job` FOREIGN KEY (`Current_Job_ID`) REFERENCES `jobs` (`Job_ID`) ON DELETE SET NULL,
  CONSTRAINT `FK_Mach_Operator` FOREIGN KEY (`Current_Operator_ID`) REFERENCES `employees` (`Employee_ID`) ON DELETE SET NULL,
  CONSTRAINT `chk_mach_type` CHECK (`Machine_Type` in ('Auto','Manual')),
  CONSTRAINT `chk_mach_status` CHECK (`Status` in ('Running','Idle','Stopped','Maintenance'))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machines`
--

LOCK TABLES `machines` WRITE;
/*!40000 ALTER TABLE `machines` DISABLE KEYS */;
INSERT INTO `machines` VALUES (1,'Machine-01','Auto','Running',3,1,'2026-04-03 15:22:01',NULL,'Section A',NULL,3000,'Flat Belt',NULL),(2,'Machine-02','Auto','Idle',NULL,NULL,NULL,NULL,'Section A',NULL,3000,'Flat Belt',NULL),(3,'Machine-03','Auto','Idle',NULL,NULL,NULL,NULL,'Section A',NULL,3000,'Flat Belt',NULL),(4,'Machine-04','Auto','Idle',NULL,NULL,NULL,NULL,'Section B',NULL,3000,'Flat Belt',NULL),(5,'Machine-05','Auto','Idle',NULL,NULL,NULL,NULL,'Section B',NULL,2500,'Flat Belt',NULL),(6,'Machine-06','Manual','Idle',NULL,NULL,NULL,NULL,'Section B',NULL,1500,'Flat Belt',NULL),(7,'Machine-07','Manual','Idle',NULL,NULL,NULL,NULL,'Section C',NULL,1500,'Flat Belt',NULL),(8,'Machine-08','Manual','Idle',NULL,NULL,NULL,NULL,'Section C',NULL,1500,'Flat Belt',NULL),(9,'Machine-09','Auto','Idle',NULL,NULL,NULL,NULL,'Section C',NULL,3000,'Flat Belt',NULL),(10,'Machine-10','Auto','Idle',NULL,NULL,NULL,NULL,'Section D',NULL,3500,'Flat Belt',NULL),(11,'Machine-11','Manual','Idle',NULL,NULL,NULL,NULL,'Section D',NULL,1500,'Flat Belt',NULL),(12,'Machine-12','Auto','Idle',NULL,NULL,NULL,NULL,'Section D',NULL,3500,'Flat Belt',NULL),(13,'Machine-13','Manual','Idle',NULL,NULL,NULL,NULL,'Section E',NULL,1500,'Flat Belt',NULL),(14,'Machine-14','Auto','Idle',NULL,NULL,NULL,NULL,'Section E',NULL,3000,'Flat Belt',NULL),(15,'Machine-15','Manual','Idle',NULL,NULL,NULL,NULL,'Section E',NULL,1500,'Flat Belt',NULL);
/*!40000 ALTER TABLE `machines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_requests`
--

DROP TABLE IF EXISTS `order_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_requests` (
  `Request_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) NOT NULL,
  `Request_Date` datetime DEFAULT current_timestamp(),
  `Label_Name` varchar(100) DEFAULT NULL,
  `Label_Type` varchar(50) DEFAULT NULL,
  `Size` varchar(50) DEFAULT NULL,
  `Quantity` int(11) NOT NULL,
  `Paper` varchar(50) DEFAULT NULL,
  `Core` varchar(20) DEFAULT NULL,
  `Packing` varchar(50) DEFAULT NULL,
  `Notes` varchar(500) DEFAULT NULL,
  `Artwork_Path` varchar(300) DEFAULT NULL,
  `Required_By` date DEFAULT NULL,
  `Delivery_Address` varchar(300) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Pending',
  `Owner_Notes` varchar(300) DEFAULT NULL,
  `Reviewed_By` int(11) DEFAULT NULL,
  `Reviewed_At` datetime DEFAULT NULL,
  `Job_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Request_ID`),
  KEY `Customer_ID` (`Customer_ID`),
  KEY `Reviewed_By` (`Reviewed_By`),
  KEY `Job_ID` (`Job_ID`),
  CONSTRAINT `order_requests_ibfk_1` FOREIGN KEY (`Customer_ID`) REFERENCES `customer_master` (`Customer_ID`),
  CONSTRAINT `order_requests_ibfk_2` FOREIGN KEY (`Reviewed_By`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `order_requests_ibfk_3` FOREIGN KEY (`Job_ID`) REFERENCES `jobs` (`Job_ID`),
  CONSTRAINT `chk_order_status` CHECK (`Status` in ('Pending','Reviewing','Approved','Rejected','In Production','Completed','Dispatched'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_requests`
--

LOCK TABLES `order_requests` WRITE;
/*!40000 ALTER TABLE `order_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_items` (
  `PItem_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Purchase_ID` int(11) NOT NULL,
  `Item_ID` int(11) DEFAULT NULL,
  `Item_Name` varchar(200) DEFAULT NULL,
  `Item_Code` varchar(50) DEFAULT NULL,
  `Qty` decimal(10,3) DEFAULT 0.000,
  `Unit` varchar(20) DEFAULT 'Roll',
  `Rate` decimal(10,2) DEFAULT 0.00,
  `Amount` decimal(12,2) DEFAULT 0.00,
  `Tax_Pct` decimal(5,2) DEFAULT 0.00,
  `Tax_Amount` decimal(12,2) DEFAULT 0.00,
  `HSN_Code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`PItem_ID`),
  KEY `Purchase_ID` (`Purchase_ID`),
  KEY `Item_ID` (`Item_ID`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`Purchase_ID`) REFERENCES `purchase_register` (`Purchase_ID`) ON DELETE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`Item_ID`) REFERENCES `item_master` (`Item_ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_register`
--

DROP TABLE IF EXISTS `purchase_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_register` (
  `Purchase_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Purchase_Number` varchar(30) NOT NULL,
  `Supplier_ID` int(11) DEFAULT NULL,
  `Purchase_Date` date NOT NULL,
  `Supplier_Name` varchar(200) NOT NULL,
  `Supplier_GST` varchar(20) DEFAULT NULL,
  `Contact_Person` varchar(100) DEFAULT NULL,
  `Invoice_No` varchar(100) DEFAULT NULL,
  `Invoice_Date` date DEFAULT NULL,
  `Gross_Amount` decimal(12,2) DEFAULT 0.00,
  `Discount_Amt` decimal(12,2) DEFAULT 0.00,
  `Tax_Amount` decimal(12,2) DEFAULT 0.00,
  `Net_Amount` decimal(12,2) DEFAULT 0.00,
  `Amount_Paid` decimal(12,2) DEFAULT 0.00,
  `Balance_Due` decimal(12,2) DEFAULT 0.00,
  `Payment_Status` enum('Unpaid','Partial','Paid') DEFAULT 'Unpaid',
  `Payment_Mode` varchar(50) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `Created_By` int(11) DEFAULT NULL,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Purchase_ID`),
  UNIQUE KEY `Purchase_Number` (`Purchase_Number`),
  KEY `Created_By` (`Created_By`),
  CONSTRAINT `purchase_register_ibfk_1` FOREIGN KEY (`Created_By`) REFERENCES `employees` (`Employee_ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_register`
--

LOCK TABLES `purchase_register` WRITE;
/*!40000 ALTER TABLE `purchase_register` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_register` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roster`
--

DROP TABLE IF EXISTS `roster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roster` (
  `Roster_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Employee_ID` int(11) NOT NULL,
  `Roster_Date` date NOT NULL,
  `Shift_ID` int(11) DEFAULT NULL,
  `Is_Off_Day` tinyint(1) DEFAULT 0,
  `Notes` varchar(200) DEFAULT NULL,
  `Assigned_By` int(11) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Roster_ID`),
  UNIQUE KEY `uq_roster` (`Employee_ID`,`Roster_Date`),
  KEY `Shift_ID` (`Shift_ID`),
  KEY `Assigned_By` (`Assigned_By`),
  CONSTRAINT `roster_ibfk_1` FOREIGN KEY (`Employee_ID`) REFERENCES `employees` (`Employee_ID`),
  CONSTRAINT `roster_ibfk_2` FOREIGN KEY (`Shift_ID`) REFERENCES `shifts` (`Shift_ID`),
  CONSTRAINT `roster_ibfk_3` FOREIGN KEY (`Assigned_By`) REFERENCES `employees` (`Employee_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roster`
--

LOCK TABLES `roster` WRITE;
/*!40000 ALTER TABLE `roster` DISABLE KEYS */;
/*!40000 ALTER TABLE `roster` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(500) NOT NULL DEFAULT '',
  `setting_label` varchar(200) DEFAULT NULL,
  `setting_group` varchar(50) DEFAULT 'general',
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('bank_account','','Account Number','bank'),('bank_account_name','','Account Holder Name','bank'),('bank_branch','','Branch Name','bank'),('bank_ifsc','','IFSC Code','bank'),('bank_name','','Bank Name','bank'),('cgst_rate','9','CGST Rate %','gst'),('challan_series','DC','Challan Series Prefix','invoice'),('company_legal_name','','Legal / Registered Name','company'),('company_tagline','','Tagline','company'),('company_website','','Website URL','company'),('country','India','Country','company'),('currency_symbol','₹','Currency Symbol','billing'),('default_gst_rate','18','Default GST Rate %','gst'),('factory_address','','Factory Address','company'),('factory_city','','City','company'),('factory_email','','Email','company'),('factory_gst','','GST Number','company'),('factory_mobile','','Mobile / WhatsApp','company'),('factory_name','Barcode Label Factory','Factory / Company Name','company'),('factory_pan','','PAN Number','company'),('factory_pincode','','Pincode','company'),('factory_state','','State','company'),('gst_state_code','09','GST State Code','gst'),('igst_rate','18','IGST Rate %','gst'),('invoice_format','PREFIX-YY-NNNN','Invoice Number Format','invoice'),('invoice_prefix','INV','Invoice Number Prefix','billing'),('invoice_series','INV','Invoice Series Prefix','invoice'),('job_prefix','JOB','Job Number Prefix','billing'),('logo_url','','Company Logo URL','company'),('next_invoice_no','1','Next Invoice Number','invoice'),('notify_milestones','1','Notify at 25/50/75% milestones','telegram'),('notify_on_job_complete','1','Notify when job completes','telegram'),('notify_on_job_start','1','Notify when job starts','telegram'),('sgst_rate','9','SGST Rate %','gst'),('state','Uttar Pradesh','State','company'),('tax_percent','18','Default Tax %','billing'),('telegram_bot_token','','Telegram Bot Token','telegram'),('telegram_enabled','0','Enable Telegram Notifications','telegram'),('telegram_owner_chat_id','','Owner Chat ID','telegram'),('telegram_token','','Telegram Bot Token','telegram');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shifts` (
  `Shift_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Shift_Name` varchar(50) NOT NULL,
  `Start_Time` time NOT NULL,
  `End_Time` time NOT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Shift_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_master`
--

DROP TABLE IF EXISTS `supplier_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_master` (
  `Supplier_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Supplier_Name` varchar(200) NOT NULL,
  `Mobile` varchar(20) DEFAULT NULL,
  `Alt_Mobile` varchar(20) DEFAULT NULL,
  `Email` varchar(200) DEFAULT NULL,
  `Address` text DEFAULT NULL,
  `City` varchar(100) DEFAULT NULL,
  `State` varchar(100) DEFAULT NULL,
  `State_Code` varchar(5) DEFAULT NULL,
  `GST_No` varchar(20) DEFAULT NULL,
  `PAN_No` varchar(20) DEFAULT NULL,
  `Category` varchar(50) DEFAULT 'Regular',
  `Bank_Name` varchar(100) DEFAULT NULL,
  `Bank_Account` varchar(50) DEFAULT NULL,
  `Bank_IFSC` varchar(20) DEFAULT NULL,
  `Credit_Limit` decimal(12,2) DEFAULT 0.00,
  `Current_Balance` decimal(12,2) DEFAULT 0.00,
  `Opening_Balance` decimal(12,2) DEFAULT 0.00,
  `Notes` text DEFAULT NULL,
  `Photo_Path` varchar(500) DEFAULT NULL,
  `Is_Active` tinyint(1) DEFAULT 1,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Supplier_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_master`
--

LOCK TABLES `supplier_master` WRITE;
/*!40000 ALTER TABLE `supplier_master` DISABLE KEYS */;
INSERT INTO `supplier_master` VALUES (1,'Paper Roll Suppliers Pvt Ltd','9876543210',NULL,NULL,NULL,'Noida','Uttar Pradesh','09','09AAAAA0000A1Z5',NULL,'Regular',NULL,NULL,NULL,0.00,0.00,0.00,NULL,NULL,1,'2026-04-03 18:18:09'),(2,'Thermal Media India','9988776655',NULL,NULL,NULL,'Delhi','Delhi','07','07BBBBB0000B1Z4',NULL,'Wholesale',NULL,NULL,NULL,0.00,0.00,0.00,NULL,NULL,1,'2026-04-03 18:18:09'),(3,'Ribbon House','9112233445',NULL,NULL,NULL,'Mumbai','Maharashtra','27','27CCCCC0000C1Z3',NULL,'Regular',NULL,NULL,NULL,0.00,0.00,0.00,NULL,NULL,1,'2026-04-03 18:18:09');
/*!40000 ALTER TABLE `supplier_master` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-04  0:13:16
