import { Router } from "express";
import { body } from "express-validator";
import { ProjectController } from "../controllers/Project.controller";
import { handleInputErrors } from "../middlewares/validation";

const router = Router();

router.post('/', 
    body('projectName').notEmpty().withMessage('El nombre del proyecto es obligatorio'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es obligatorio'),
    body('description').notEmpty().withMessage('La descripcion del proyecto es obligatorio'),
    handleInputErrors,
    ProjectController.createProject);


    
router.get('/', ProjectController.getAllProjects);

export default router;