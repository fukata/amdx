// generated by scripts/add-page.js
// @ts-ignore
import Doc, { frontmatter } from "../docs/202005040322.mdx";
import { ItemLayout } from "../components/ItemLayout";
import ssgConfig from "../mdxx-ssg.json";
const newProps = { ...ssgConfig, ...frontmatter };

export const config = {
  amp: true,
};

export default () => (
  <ItemLayout {...(newProps as any)}>
    <Doc amp />
  </ItemLayout>
);
