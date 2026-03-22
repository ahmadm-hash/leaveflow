import { ensureDepartmentHeadUser } from "../utils/ensureDepartmentHeadUser";

const run = async (): Promise<void> => {
  await ensureDepartmentHeadUser();
  process.exit(0);
};

run().catch((error) => {
  console.error("Failed to ensure department head user", error);
  process.exit(1);
});