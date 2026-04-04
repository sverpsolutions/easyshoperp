-- ============================================================
-- BUG FIX PATCH - Run this on existing BarcodeMES database
-- Fixes sp_StopJob to keep operator assigned to machine
-- ============================================================

USE BarcodeMES;
GO

CREATE OR ALTER PROCEDURE sp_StopJob
    @Job_ID INT,
    @Machine_ID INT,
    @Produced_Qty INT,
    @Status NVARCHAR(20) = 'Completed'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    UPDATE Jobs SET
        Status = @Status,
        Produced_Qty = Produced_Qty + @Produced_Qty,
        End_Time = GETDATE()
    WHERE Job_ID = @Job_ID;
    
    -- Keep Current_Operator_ID so operator stays on their machine
    UPDATE Machines SET
        Status = 'Idle',
        Current_Job_ID = NULL,
        Last_OFF_Time = GETDATE()
    WHERE Machine_ID = @Machine_ID;
    
    UPDATE Machine_Log SET
        End_Time = GETDATE(),
        Total_Run_Minutes = DATEDIFF(MINUTE, Start_Time, GETDATE())
    WHERE Machine_ID = @Machine_ID AND Job_ID = @Job_ID AND End_Time IS NULL;
    
    COMMIT TRANSACTION;
END;
GO

PRINT 'sp_StopJob patched successfully!';
GO
