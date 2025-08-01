import {
  getRandomString,
  getUserData,
  validateLoginV2,
} from "../../support/commands/general";
import { ProjectIdentifierV2 } from "../../support/types/project.types";
import { User } from "../../support/types/user.types";
import {
  createProjectIfMissingAPIV2,
  deleteProjectFromAPIV2,
  getProjectByNamespaceAPIV2,
} from "../../support/utils/projectsV2.utils";

const sessionId = ["projectResources", getRandomString()];

describe("Project resources - work with code, data, environments", () => {
  // Define some project details
  const projectNameRandomPart = getRandomString();
  const projectName = `project-resources-${projectNameRandomPart}`;
  const projectDescription =
    "This is a test project from Cypress to test working with code, data, environments";
  const projectIdentifier: ProjectIdentifierV2 = {
    slug: projectName,
    id: null,
    namespace: null,
  };

  // Create a project and keep that around for the rest of the tests
  before(() => {
    // Login
    cy.session(
      sessionId,
      () => {
        cy.robustLogin("v2");
      },
      validateLoginV2,
    );

    // Create the project and save its deetails
    getUserData().then((user: User) => {
      projectIdentifier.namespace = user.username;
      createProjectIfMissingAPIV2({
        description: projectDescription,
        name: projectName,
        namespace: user.username,
        slug: projectName,
        visibility: "private",
      }).then((project) => (projectIdentifier.id = project.id));
    });
  });

  // Restore the session (login)
  beforeEach(() => {
    cy.session(
      sessionId,
      () => {
        cy.robustLogin("v2");
      },
      validateLoginV2,
    );
  });

  // Cleanup the project after the test -- useful on failure
  after(() => {
    getProjectByNamespaceAPIV2(projectIdentifier).then((response) => {
      if (response.status === 200) {
        projectIdentifier.id = response.body.id;
        projectIdentifier.namespace = response.body.namespace;
        deleteProjectFromAPIV2(projectIdentifier);
      }
    });
  });

  const visitCurrentProject = () => {
    // There should a link on the dashboard for a newly created project
    cy.visit("/v2");
    cy.getDataCy("dashboard-project-list")
      .get(
        `a[href*="/${projectIdentifier.namespace}/${projectIdentifier.slug}"]`,
      )
      .click();
    cy.getDataCy("project-name").should("contain", projectName);
  };

  it("Add and modify data connectors", () => {
    const name = `giab-${getRandomString()}`;

    // Add data connector
    visitCurrentProject();
    cy.getDataCy("add-data-connector").click();
    cy.getDataCy("project-data-controller-mode-create").click();
    cy.getDataCy("data-connector-edit-next-button").should("be.disabled");
    cy.getDataCy("data-storage-s3").click();
    cy.getDataCy("data-provider-AWS").click();
    cy.getDataCy("data-connector-edit-next-button").click();

    cy.getDataCy("data-connector-source-path").should("be.empty").type("giab");
    cy.getDataCy("test-data-connector-button").click();
    cy.getDataCy("cloud-storage-connection-success").should("be.visible");
    cy.getDataCy("add-data-connector-continue-button").click();

    cy.getDataCy("data-connector-name-input").should("be.empty").type(name);
    cy.getDataCy("data-connector-slug-toggle").click();
    cy.getDataCy("data-connector-slug-input").should("have.value", name);
    cy.getDataCy("data-connector-mount-input").should("have.value", name);
    cy.getDataCy("data-connector-edit-update-button").click();
    cy.getDataCy("data-connector-edit-success").should("be.visible");
    cy.getDataCy("data-connector-edit-close-button").click();

    // ? Currently, data connectors newly linked might not appear immediately
    visitCurrentProject();
    cy.getDataCy("data-connector-box")
      .find(`[data-cy=data-connector-name]`)
      .contains(name);

    // Edit data connector
    const newName = `${name} edited`;

    cy.getDataCy("data-connector-box")
      .find(`[data-cy=data-connector-name]`)
      .contains(name)
      .click();
    cy.getDataCy("data-connector-edit").click();

    cy.getDataCy("data-connector-name-input")
      .should("have.value", name)
      .clear()
      .type(newName);
    cy.getDataCy("data-connector-slug-toggle").click();
    cy.getDataCy("data-connector-slug-input").should("have.value", name);
    cy.getDataCy("data-connector-mount-input").should("have.value", name);
    cy.getDataCy("data-connector-edit-update-button").click();
    cy.getDataCy("data-connector-edit-success").should("be.visible");
    cy.getDataCy("data-connector-edit-close-button").click();

    // ? Currently, data connectors newly linked might not appear immediately
    visitCurrentProject();
    cy.getDataCy("data-connector-box")
      .find(`[data-cy=data-connector-name]`)
      .contains(newName);
  });

  it("Add and modify code repositories", () => {
    const repoUrl = "https://github.com/SwissDataScienceCenter/renku-ui.git";
    const repoName = "renku-ui";
    const repoUrlEdited =
      "https://github.com/SwissDataScienceCenter/renku-data-services.git";
    const repoNameEdited = "renku-data-services";

    // Add code repository
    visitCurrentProject();
    cy.getDataCy("add-code-repository").click();
    cy.getDataCy("project-add-repository-url").should("be.empty").type(repoUrl);
    cy.getDataCy("add-code-repository-modal-button").click();
    cy.getDataCy("code-repositories-box")
      .find("[data-cy=code-repository-item]")
      .contains(repoName);
    cy.contains("[data-cy=code-repository-item]", repoName).contains(
      "Pull only",
    );

    // Edit code repository
    cy.contains("[data-cy=code-repository-item]", repoName)
      .find("[data-cy=code-repository-edit]")
      .click();
    cy.getDataCy("project-edit-repository-url")
      .should("have.value", repoUrl)
      .clear()
      .type(repoUrlEdited);
    cy.getDataCy("edit-code-repository-modal-button").click();
    cy.getDataCy("code-repositories-box")
      .find("[data-cy=code-repository-item]")
      .contains(repoNameEdited);
    cy.contains("[data-cy=code-repository-item]", repoNameEdited).contains(
      "Pull only",
    );
  });

  it("Add and modify session environments", () => {
    const sessionImage = "alpine:latest";
    const sessionUrl = "/test";
    const sessionName = `vscode-${getRandomString()}`;

    // Add session environment
    visitCurrentProject();
    cy.getDataCy("add-session-launcher").click();
    cy.getDataCy("environment-kind-custom").click();
    cy.getDataCy("custom-image-input").should("be.empty").type(sessionImage);
    cy.getDataCy("session-launcher-field-default_url").clear().type(sessionUrl);
    cy.getDataCy("next-session-button").click();
    cy.getDataCy("launcher-name-input").should("be.empty").type(sessionName);
    cy.getDataCy("add-session-button").click();
    cy.getDataCy("session-launcher-creation-success").should("be.visible");
    cy.getDataCy("close-cancel-button").click();

    // Edit session environment
    cy.getDataCy("sessions-box")
      .contains("[data-cy=session-launcher-item]", sessionName)
      .click();
    cy.getDataCy("session-view-menu-edit").click();
    cy.getDataCy("edit-session-name")
      .should("have.value", sessionName)
      .clear()
      .type(`${sessionName}-edited`);
    cy.getDataCy("edit-session-button").click();
    cy.getDataCy("session-launcher-update-success").should("be.visible");
    cy.getDataCy("close-cancel-button").click();
    cy.getDataCy("sessions-box").contains(
      "[data-cy=session-launcher-item]",
      sessionName,
    );
  });
});
