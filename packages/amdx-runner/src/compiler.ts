import React from "react";
import { Node, ImportNode, ExportNode } from "../index";
// @ts-ignore
import camelCaseCSS from "camelcase-css";
// @ts-ignore
import { paramCase } from "@mdx-js/util";
import styleToObject from "style-to-object";

function convertStyleStringToObject(style: string): any {
  let styleObject: { [key: string]: any } = {};
  // @ts-ignore
  styleToObject(style, (name: string, value: any) => {
    styleObject[camelCaseCSS(name)] = value;
  });
  return styleObject;
}

const paramCaseRe = /^(aria[A-Z])|(data[A-Z])/;
function toProps(props: any) {
  if (typeof props.style === "string") {
    props.style = convertStyleStringToObject(props.style);
  }
  if (props.class) {
    props.className = props.class;
    delete props.class;
  }

  // className array to string
  if (props.className && props.className instanceof Array) {
    props.className = props.className.join(" ");
  }
  return Object.entries(props).reduce((acc, [key, value]) => {
    return { ...acc, [paramCaseRe.test(key) ? paramCase(key) : key]: value };
  }, {});
}

const ampComponents = {
  img(props: any) {
    // expect ![alttext:500](https://...)
    let [newAlt, height] = props.alt?.split(":") ?? ["", ""];
    const ampImgProps = { src: props.src, alt: newAlt, layout: "fill" };

    height = height || "480px";

    if (!String(height).endsWith("px")) {
      height = `${height}px`;
    }

    return React.createElement(
      "div",
      { className: "amp-img-container", style: { height } },
      React.createElement("amp-img", ampImgProps)
    );
  },
  a(props: any) {
    // only url
    if (props.href === props.children) {
      // amp-twitter
      // expect https://twitter.com/username/status/xxxxx
      const matchTwitter = props.href.match(/^https?:\/\/twitter\.com\/\w+\/status\/([0-9]+)$/)
      if (matchTwitter) {
        const ampTwitterProps = {
          "data-tweetid": matchTwitter[1],
          width: "375",
          height: "472",
          layout: "responsive",
        }
        return React.createElement(
          "div",
          { className: "amp-twitter-container" },
          React.createElement("amp-twitter", ampTwitterProps)
        );
      }

      // amp-youtube
      // expect https://www.youtube.com/watch?v=xxxxx
      const matchYoutube = props.href.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([0-9a-zA-Z\-]+)$/)
      if (matchYoutube) {
        const ampYoutubeProps = {
          "data-videoid": matchYoutube[1],
          width: "480",
          height: "270",
          layout: "responsive",
        }
        return React.createElement(
          "div",
          { className: "amp-youtube-container" },
          React.createElement("amp-youtube", ampYoutubeProps)
        );
      }
    }

    return React.createElement(
      "a",
      { href: props.href, title: props.title },
      props.children ?? props.href,
    );
  },
};

export function compile(
  root: Node,
  {
    props = {},
    h,
    Fragment,
    components,
  }: {
    props?: { amp?: boolean; components?: { [key: string]: any } };
    h: typeof React.createElement;
    Fragment: typeof React.Fragment;
    components: { [key: string]: any };
  }
): React.ReactElement | string {
  components =
    props.amp === true ? { ...ampComponents, ...components } : components;
  return _compile(root);
  function _compile(node: Node): React.ReactElement | string {
    function resolveComponent(tagName: string) {
      // direct props
      if (components[tagName]) {
        return components[tagName];
      }

      // Base root props
      if (props && props.components && props.components[tagName]) {
        return props.components[tagName];
      }
      // default root
      return tagName;
    }

    switch (node.type) {
      case "jsx": {
        return _toNode(node.value.tagName, node.value.props);
        function _toNode(
          tagName: string,
          props: {
            children?: Array<{ tagName: string; props: any }>;
            [k: string]: any;
          }
        ): React.ReactElement | string {
          const { children, ...others } = props || {};
          return h(
            resolveComponent(tagName),
            toProps(others),
            ...(children
              ? children.map((c) => {
                  if (typeof c === "string") {
                    return c;
                  }
                  return _toNode(c.tagName, c.props);
                })
              : [])
          );
        }
      }
      case "element": {
        return h(
          resolveComponent(node.tagName),
          toProps(node.properties),
          ...(node.children ? node.children.map(_compile) : [])
        );
      }
      case "text": {
        return node.value;
      }
      case "root": {
        const importNodes: ImportNode[] = [];
        const exportNodes: ExportNode[] = [];
        const nodes = [];
        // let layout;
        for (const child of node.children) {
          if (child.type === "import") {
            importNodes.push(child);
            continue;
          }
          if (child.type === "export") {
            exportNodes.push(child);
            continue;
          }
          nodes.push(child);
        }
        return h(
          Fragment,
          {},
          ...nodes.map((child, key) => {
            return h(Fragment, { key }, _compile(child));
          })
        );
      }
      default: {
        // @ts-ignore
        throw new Error(`unknown node: ${node.type}`);
      }
    }
  }
}
