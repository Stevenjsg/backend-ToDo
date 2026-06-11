import { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProgress,
  getShareLink,
  createShareLink,
  revokeShareLink,
} from "./projects.controller";
import { protect } from "../../middleware/auth.middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../items/items.validator"; // Reuse error handler
import membersRouter from "../members/members.routes";
import { createInviteLink } from "../members/members.controller";
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
router.post(
  "/:uuid/invite-link",
  validateProjectUuid,
  body("role").isIn(["viewer", "editor"]).withMessage("Rol inválido"),
  handleValidationErrors,
  createInviteLink
);
router.get(
  "/:uuid/progress",
  validateProjectUuid,
  handleValidationErrors,
  getProgress
);
router.get(
  "/:uuid/my-role",
  validateProjectUuid,
  handleValidationErrors,
  getMyRole
);
// Reporte compartible (ROADMAP F4): gestión del link público
router.get(
  "/:uuid/share",
  validateProjectUuid,
  handleValidationErrors,
  getShareLink
);
router.post(
  "/:uuid/share",
  validateProjectUuid,
  handleValidationErrors,
  createShareLink
);
router.delete(
  "/:uuid/share",
  validateProjectUuid,
  handleValidationErrors,
  revokeShareLink
);

export default router;
