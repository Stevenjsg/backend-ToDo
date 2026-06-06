import { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from "./projects.controller";
import { protect } from "../../middleware/auth.middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../items/items.validator"; // Reuse error handler
import membersRouter from "../members/members.routes";
import { getMyRole } from "./projects.controller";

const router = Router();
router.use(protect); // Protect all project routes

const validateProjectData = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del proyecto es requerido")
    .isString(),
  body("descripcion").optional({ nullable: true }).isString(),
];

const validateProjectUuid = [
  param("uuid")
    .isUUID(4)
    .withMessage("El UUID del proyecto debe ser un UUID válido"),
];

router.post("/", validateProjectData, handleValidationErrors, createProject);
router.get("/", getProjects);
router.get("/:uuid", validateProjectUuid, handleValidationErrors, getProject);
router.put(
  "/:uuid",
  validateProjectUuid,
  validateProjectData,
  handleValidationErrors,
  updateProject
);
router.delete(
  "/:uuid",
  validateProjectUuid,
  handleValidationErrors,
  deleteProject
);
router.use("/:projectUuid/members", membersRouter);
router.get(
  "/:uuid/my-role",
  validateProjectUuid,
  handleValidationErrors,
  getMyRole
);

export default router;
